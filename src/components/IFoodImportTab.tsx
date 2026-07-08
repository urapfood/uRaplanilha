import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Check, 
  Plus, 
  RefreshCw, 
  AlertCircle, 
  Info, 
  HelpCircle, 
  ArrowRight, 
  Trash2,
  CheckCircle2,
  Sparkles,
  ClipboardList,
  Loader2
} from 'lucide-react';
import { Product } from '../types';
import loaderImage from '../assets/images/ifood_import_loader_1783508448729.jpg';

// Dynamically load PDF.js from CDN to avoid bundle worker compilation issues in Vite
const loadPdfJs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(pdfjsLib);
    };
    script.onerror = () => reject(new Error('Falha ao carregar a biblioteca de leitura de PDF.'));
    document.head.appendChild(script);
  });
};

const extractTextFromPdf = async (file: File): Promise<string> => {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
};

const parseTextFromIFoodReport = (text: string): string[][] => {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const rows: string[][] = [
    ['Produto', 'Quantidade', 'Preço de Venda']
  ];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // Ignore meta information lines
    const isHeaderOrMetadata = /período|total|resumo|pedido|data|vendas|relatório|portal|parceiro|cnpj|página/i.test(line);
    const isPrice = /r\$\s*\d+/i.test(line) || /^\d+[\.,]\d{2}$/.test(line);
    const isQty = /^\d+$/.test(line) || /^\d+\s*(?:un|x|qtd)$/i.test(line);
    
    if (line.length > 2 && !isHeaderOrMetadata && !isPrice && !isQty) {
      let qty = '';
      let price = '';
      
      // Look ahead up to 5 lines for a quantity and a price
      for (let j = 1; j <= 5 && i + j < lines.length; j++) {
        const nextLine = lines[i + j];
        if (!qty && (/^\d+$/.test(nextLine) || /^\d+\s*(?:un|x|qtd)$/i.test(nextLine))) {
          qty = nextLine.replace(/\D/g, '');
        }
        if (!price && (/r\$\s*\d+[\.,]\d{2}/i.test(nextLine) || /^\d+[\.,]\d{2}$/.test(nextLine))) {
          price = nextLine;
        }
      }
      
      if (qty && price) {
        rows.push([line, qty, price]);
        i++;
        continue;
      }
    }
    
    // Check single-line formats
    const singleLineMatch1 = line.match(/^(.+?)\s+(\d+)\s+(?:r\$)?\s*(\d+[\.,]\d{2})/i);
    if (singleLineMatch1) {
      const name = singleLineMatch1[1].trim();
      const qty = singleLineMatch1[2];
      const price = singleLineMatch1[3];
      if (name && qty && price && !/total|cnpj|portal/i.test(name)) {
        rows.push([name, qty, price]);
        i++;
        continue;
      }
    }

    const singleLineMatch2 = line.match(/^(\d+)\s*(?:x|un)?\s+(.+?)\s+(?:r\$)?\s*(\d+[\.,]\d{2})/i);
    if (singleLineMatch2) {
      const qty = singleLineMatch2[1];
      const name = singleLineMatch2[2].trim();
      const price = singleLineMatch2[3];
      if (name && qty && price && !/total|cnpj|portal/i.test(name)) {
        rows.push([name, qty, price]);
        i++;
        continue;
      }
    }

    i++;
  }

  // Fallback: search by comma or semicolon splits
  if (rows.length === 1) {
    lines.forEach(line => {
      const parts = line.split(/\t|;| {2,}/).map(p => p.trim()).filter(p => p.length > 0);
      if (parts.length >= 3) {
        const priceIdx = parts.findIndex(p => /r\$/i.test(p) || /\d+[\.,]\d{2}/.test(p));
        const qtyIdx = parts.findIndex(p => /^\d+$/.test(p));
        const nameIdx = parts.findIndex((p, idx) => idx !== priceIdx && idx !== qtyIdx);
        
        if (priceIdx !== -1 && qtyIdx !== -1 && nameIdx !== -1) {
          rows.push([parts[nameIdx], parts[qtyIdx], parts[priceIdx]]);
        }
      }
    });
  }

  return rows;
};

interface IFoodImportTabProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

interface ParsedItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  selected: boolean;
  status: 'new' | 'update';
  matchedProductId?: string;
  matchedProductName?: string;
}

export default function IFoodImportTab({ products, setProducts, showToast }: IFoodImportTabProps) {
  // Input states
  const [inputText, setInputText] = useState('');
  const [activeInputTab, setActiveInputTab] = useState<'upload' | 'paste'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  
  // Parsed states
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [hasHeaders, setHasHeaders] = useState(true);
  
  // Mapping dropdown selections
  const [nameColIndex, setNameColIndex] = useState<number>(0);
  const [qtyColIndex, setQtyColIndex] = useState<number>(1);
  const [priceColIndex, setPriceColIndex] = useState<number>(2);
  
  // Categories for new products
  const [newProductCategory, setNewProductCategory] = useState('iFood');
  const [updatePrices, setUpdatePrices] = useState(true);
  
  // Custom headers state
  const headers = useMemo(() => {
    if (parsedRows.length === 0) return [];
    if (hasHeaders) {
      return parsedRows[0];
    } else {
      return Array.from({ length: parsedRows[0].length }, (_, i) => `Coluna ${i + 1}`);
    }
  }, [parsedRows, hasHeaders]);

  // Clean numbers helper
  const parseNumericValue = (val: string): number => {
    if (!val) return 0;
    // Remove R$, currency symbols, and spaces
    let clean = val.replace(/[R$\s]/g, '');
    // If it has both dots and commas (e.g. 1.250,50), remove dots and replace comma with dot
    if (clean.includes('.') && clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
      // Just a comma (e.g. 45,90)
      clean = clean.replace(',', '.');
    }
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  // Process rows into typed parsed items based on mappings
  const parsedItems: ParsedItem[] = useMemo(() => {
    if (parsedRows.length === 0) return [];
    
    // Determine data rows
    const dataRows = hasHeaders ? parsedRows.slice(1) : parsedRows;
    
    return dataRows
      .map((row, idx) => {
        // Safe access to columns
        const rawName = row[nameColIndex] || '';
        const rawQty = row[qtyColIndex] || '';
        const rawPrice = row[priceColIndex] || '';
        
        const name = rawName.trim();
        if (!name) return null; // skip empty lines

        const quantity = Math.round(parseNumericValue(rawQty));
        const price = parseNumericValue(rawPrice);
        
        // Find existing product matching this name
        const match = products.find(
          (p) => p.name.trim().toLowerCase() === name.toLowerCase()
        );
        
        return {
          id: `item-${idx}`,
          name,
          quantity,
          price,
          selected: true,
          status: match ? 'update' as const : 'new' as const,
          matchedProductId: match?.id,
          matchedProductName: match?.name
        };
      })
      .filter((item): item is ParsedItem => item !== null);
  }, [parsedRows, nameColIndex, qtyColIndex, priceColIndex, hasHeaders, products]);

  // Selected items management
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, boolean>>({});

  // Sync selection state whenever parsedItems changes
  React.useEffect(() => {
    const initialSelections: Record<string, boolean> = {};
    parsedItems.forEach(item => {
      initialSelections[item.id] = true;
    });
    setSelectedItemIds(initialSelections);
  }, [parsedRows, nameColIndex, qtyColIndex, priceColIndex, hasHeaders]);

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleAllSelections = () => {
    const allSelected = parsedItems.every(item => selectedItemIds[item.id]);
    const nextSelections: Record<string, boolean> = {};
    parsedItems.forEach(item => {
      nextSelections[item.id] = !allSelected;
    });
    setSelectedItemIds(nextSelections);
  };

  // CSV/TSV parsing algorithm
  const handleParseContent = (text: string) => {
    if (!text.trim()) {
      showToast('Por favor, insira ou envie dados válidos.', 'error');
      return;
    }

    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) {
      showToast('Nenhum dado encontrado no texto.', 'error');
      return;
    }

    // Delimiter auto-detection
    const firstLine = lines[0];
    let delimiter = '\t';
    if (firstLine.includes(';')) delimiter = ';';
    else if (firstLine.includes(',')) delimiter = ',';

    const cleanCell = (cell: string) => {
      return cell.replace(/^["']|["']$/g, '').trim();
    };

    const rows: string[][] = lines.map(line => {
      let parts: string[] = [];
      if (delimiter === '\t') {
        parts = line.split('\t');
      } else {
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === delimiter && !inQuotes) {
            parts.push(current);
            current = '';
          } else {
            current += char;
          }
        }
        parts.push(current);
      }
      return parts.map(cleanCell);
    });

    setParsedRows(rows);
    
    // Auto-detect best column mappings
    if (rows.length > 0) {
      const firstRow = rows[0].map(cell => cell.toLowerCase());
      
      // Look for name match
      const nameIndex = firstRow.findIndex(cell => 
        cell.includes('produto') || cell.includes('nome') || cell.includes('item') || cell.includes('descri') || cell.includes('name')
      );
      if (nameIndex !== -1) setNameColIndex(nameIndex);
      else setNameColIndex(0);

      // Look for qty match
      const qtyIndex = firstRow.findIndex(cell => 
        cell.includes('quantidade') || cell.includes('qtd') || cell.includes('venda') || cell.includes('qty') || cell.includes('quant')
      );
      if (qtyIndex !== -1) setQtyColIndex(qtyIndex);
      else setQtyColIndex(Math.min(1, firstRow.length - 1));

      // Look for price match
      const priceIndex = firstRow.findIndex(cell => 
        cell.includes('preço') || cell.includes('preco') || cell.includes('valor') || cell.includes('unit') || cell.includes('price') || cell.includes('venda')
      );
      if (priceIndex !== -1) setPriceColIndex(priceIndex);
      else setPriceColIndex(Math.min(2, firstRow.length - 1));
    }
    
    showToast('Relatório carregado com sucesso! Verifique o mapeamento das colunas.', 'success');
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (file.name.toLowerCase().endsWith('.pdf')) {
      setIsReadingPdf(true);
      try {
        const fullText = await extractTextFromPdf(file);
        const parsed = parseTextFromIFoodReport(fullText);
        if (parsed.length <= 1) {
          showToast('Não foi possível identificar itens estruturados no PDF. Experimente copiar e colar o texto do PDF na aba ao lado.', 'error');
          setIsReadingPdf(false);
          return;
        }
        setParsedRows(parsed);
        // Reset column mapping selectors to standard (Product, Qty, Price)
        setNameColIndex(0);
        setQtyColIndex(1);
        setPriceColIndex(2);
        showToast(`Relatório PDF importado com sucesso! ${parsed.length - 1} itens encontrados.`, 'success');
      } catch (err) {
        console.error("PDF read error:", err);
        showToast('Falha ao processar arquivo PDF. Certifique-se de que é um PDF com texto legível.', 'error');
      } finally {
        setIsReadingPdf(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleParseContent(text);
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  // Confirm and sync selected items to database
  const handleImport = async () => {
    const itemsToImport = parsedItems.filter(item => selectedItemIds[item.id]);
    if (itemsToImport.length === 0) {
      showToast('Nenhum item selecionado para importação.', 'error');
      return;
    }

    try {
      let updatedCount = 0;
      let createdCount = 0;
      const updatedProductsList = [...products];

      for (const item of itemsToImport) {
        if (item.status === 'update' && item.matchedProductId) {
          // Update existing product
          const productIdx = updatedProductsList.findIndex(p => p.id === item.matchedProductId);
          if (productIdx !== -1) {
            const currentProduct = updatedProductsList[productIdx];
            updatedProductsList[productIdx] = {
              ...currentProduct,
              estimatedSales: item.quantity,
              sellingPrice: updatePrices && item.price > 0 ? item.price : currentProduct.sellingPrice,
              notes: currentProduct.notes 
                ? `${currentProduct.notes} (Vendas atualizadas via iFood)` 
                : 'Vendas estimadas atualizadas via iFood'
            };
            updatedCount++;
          }
        } else {
          // Create new product
          const newProduct: Product = {
            id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: item.name,
            category: newProductCategory || 'iFood',
            sellingPrice: item.price || 0,
            costType: 'single',
            singleCost: 0,
            ingredients: [],
            estimatedSales: item.quantity || 0,
            notes: 'Importado automaticamente via relatório iFood'
          };
          updatedProductsList.push(newProduct);
          createdCount++;
        }
      }

      // Sync back to App state and Firestore
      await setProducts(updatedProductsList);
      
      showToast(
        `Importação concluída! ${updatedCount} produtos atualizados e ${createdCount} novos cadastrados.`,
        'success'
      );
      
      // Reset parser states to return to clean layout
      setParsedRows([]);
      setInputText('');
    } catch (err) {
      console.error("Error during import:", err);
      showToast('Ocorreu um erro ao importar os produtos para o banco de dados.', 'error');
    }
  };

  // Quick stats computed
  const stats = useMemo(() => {
    const selectedItems = parsedItems.filter(item => selectedItemIds[item.id]);
    const totalSelected = selectedItems.length;
    const newCount = selectedItems.filter(i => i.status === 'new').length;
    const updateCount = selectedItems.filter(i => i.status === 'update').length;
    
    return {
      total: parsedItems.length,
      selected: totalSelected,
      newCount,
      updateCount
    };
  }, [parsedItems, selectedItemIds]);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Title Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/60 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-brand-tomato/10 text-brand-tomato rounded-lg">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-950 dark:text-white tracking-tight flex items-center gap-1.5">
              Importar Relatório do iFood
              <span className="text-xs bg-brand-tomato/10 text-brand-tomato px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Automático
              </span>
            </h1>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
            Economize tempo. Suba o relatório de itens vendidos do portal do parceiro iFood e atualize sua planilha com faturamento e estimativa de vendas automática.
          </p>
        </div>
      </div>

      {parsedRows.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Input Card (Left Column) */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
            <div className="p-6">
              {/* Internal Tab Header */}
              <div className="flex space-x-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg mb-6 w-fit">
                <button
                  type="button"
                  onClick={() => setActiveInputTab('upload')}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                    activeInputTab === 'upload'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  Subir Arquivo (CSV, TXT, PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInputTab('paste')}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                    activeInputTab === 'paste'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  Colar Copiado (Excel / iFood)
                </button>
              </div>

              {/* Upload Drop Zone */}
              {activeInputTab === 'upload' && (
                <div 
                  className={`border-2 border-dashed rounded-xl p-10 text-center transition-all flex flex-col items-center justify-center cursor-pointer min-h-[300px] ${
                    dragActive 
                      ? 'border-brand-tomato bg-brand-tomato/5' 
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-brand-tomato/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20'
                  }`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => !isReadingPdf && document.getElementById('csv-file-input')?.click()}
                >
                  <input 
                    id="csv-file-input" 
                    type="file" 
                    accept=".csv,.txt,.pdf" 
                    className="hidden" 
                    onChange={handleFileInput} 
                    disabled={isReadingPdf}
                  />
                  {isReadingPdf ? (
                    <div className="flex flex-col items-center justify-center space-y-4 py-6">
                      <img 
                        src={loaderImage} 
                        alt="Processando relatório iFood" 
                        className="w-32 h-32 object-cover rounded-xl shadow-xs border border-zinc-100 dark:border-zinc-800 animate-pulse mb-2"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 text-brand-tomato animate-spin" />
                        <h3 className="text-base font-extrabold text-zinc-800 dark:text-zinc-200 tracking-tight">
                          Lendo e Extraindo Dados...
                        </h3>
                      </div>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs leading-relaxed">
                        Analisando estrutura de vendas do relatório do iFood. Isso pode levar alguns segundos.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 bg-brand-tomato/5 text-brand-tomato rounded-full mb-4">
                        <UploadCloud className="w-10 h-10" />
                      </div>
                      <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                        Arraste e solte o relatório do iFood
                      </h3>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5 max-w-sm">
                        Formatos suportados: <strong className="text-zinc-700 dark:text-zinc-300">.CSV</strong>, <strong className="text-zinc-700 dark:text-zinc-300">.TXT</strong> ou <strong className="text-zinc-700 dark:text-zinc-300">.PDF</strong>. O sistema identifica os separadores e colunas automaticamente.
                      </p>
                      <button
                        type="button"
                        className="mt-5 px-4 py-2 bg-brand-tomato text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-xs cursor-pointer hover:bg-brand-tomato/95"
                      >
                        Selecionar Arquivo
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Paste Text Area */}
              {activeInputTab === 'paste' && (
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Cole as colunas copiadas do Excel ou Portal iFood
                  </label>
                  <textarea
                    rows={11}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-800 dark:text-zinc-300 focus:outline-hidden focus:ring-1 focus:ring-brand-tomato focus:border-brand-tomato transition-all placeholder:text-zinc-400 placeholder:dark:text-zinc-600"
                    placeholder={`Cole aqui os dados organizados em colunas. Exemplo:
Pizza Portuguesa	25	R$ 49,90
Guaraná Lata	40	R$ 6,00
Combo Burguer	18	R$ 35,00`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleParseContent(inputText)}
                      className="px-5 py-2.5 bg-brand-tomato text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm cursor-pointer hover:bg-brand-tomato/95 flex items-center space-x-2"
                    >
                      <ClipboardList className="w-4 h-4" />
                      <span>Processar Linhas</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Step Guide Sidebar (Right Column) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-6">
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-brand-tomato" />
                <span>Como extrair o relatório no iFood?</span>
              </h2>
              
              <div className="space-y-4 text-xs text-zinc-500 dark:text-zinc-400">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-brand-tomato/10 text-brand-tomato font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <p>
                    Acesse o seu <strong className="text-zinc-800 dark:text-zinc-200">Portal do Parceiro iFood</strong>.
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-brand-tomato/10 text-brand-tomato font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <p>
                    Vá no menu lateral em <strong className="text-zinc-800 dark:text-zinc-200">Vendas</strong> e depois clique em <strong className="text-zinc-800 dark:text-zinc-200">Desempenho</strong> ou <strong className="text-zinc-800 dark:text-zinc-200">Vendas por Item</strong>.
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-brand-tomato/10 text-brand-tomato font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <p>
                    Defina o período desejado (por exemplo, os últimos 30 dias) e clique em <strong className="text-zinc-800 dark:text-zinc-200">Exportar Planilha (Excel ou CSV)</strong>.
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-brand-tomato/10 text-brand-tomato font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </div>
                  <p>
                    Abra o arquivo, <strong className="text-zinc-800 dark:text-zinc-200">copie as linhas de itens</strong> com a quantidade e preço e cole aqui, ou simplesmente <strong className="text-zinc-800 dark:text-zinc-200">solte o arquivo CSV direto</strong> na aba de upload.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-zinc-100 dark:border-zinc-800 pt-4 text-center">
              <div className="p-3 bg-brand-orange/5 text-brand-orange dark:bg-brand-orange/10 rounded-lg flex items-start space-x-3 text-left">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium leading-relaxed">
                  O sistema de inteligência local detecta se o produto já existe pelo nome. Caso exista, as vendas estimadas mensais do produto serão atualizadas de forma inteligente no sistema.
                </p>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="space-y-6">
          
          {/* COLUMN MAPPING DESIGN BOX */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-brand-orange" />
                  <span>Configurações do Mapeador de Colunas</span>
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Associe as colunas do seu arquivo aos campos corretos do sistema para uma leitura perfeita.
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasHeaders}
                    onChange={(e) => setHasHeaders(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-700 text-brand-tomato focus:ring-brand-tomato"
                  />
                  <span>Primeira linha contém cabeçalhos</span>
                </label>
                
                <button
                  onClick={() => {
                    setParsedRows([]);
                    setInputText('');
                  }}
                  className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-brand-tomato hover:border-brand-tomato rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Cancelar</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Product Name Column */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Nome do Produto
                </label>
                <select
                  value={nameColIndex}
                  onChange={(e) => setNameColIndex(Number(e.target.value))}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-brand-tomato focus:border-brand-tomato font-medium"
                >
                  {headers.map((h, i) => (
                    <option key={i} value={i} className="text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800">{h || `Coluna ${i + 1}`}</option>
                  ))}
                </select>
              </div>

              {/* Quantity Sold Column */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Quantidade Vendida
                </label>
                <select
                  value={qtyColIndex}
                  onChange={(e) => setQtyColIndex(Number(e.target.value))}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-brand-tomato focus:border-brand-tomato font-medium"
                >
                  {headers.map((h, i) => (
                    <option key={i} value={i} className="text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800">{h || `Coluna ${i + 1}`}</option>
                  ))}
                </select>
              </div>

              {/* Selling Price Column */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Preço de Venda (R$)
                </label>
                <select
                  value={priceColIndex}
                  onChange={(e) => setPriceColIndex(Number(e.target.value))}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-brand-tomato focus:border-brand-tomato font-medium"
                >
                  {headers.map((h, i) => (
                    <option key={i} value={i} className="text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800">{h || `Coluna ${i + 1}`}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* DUAL SECTION PREVIEW GRID AND CONTROLS */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Left Preview List Table */}
            <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl shadow-xs overflow-hidden">
              <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center space-x-2">
                  <span>Itens Identificados no Relatório</span>
                  <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {parsedItems.length} Encontrados
                  </span>
                </h3>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleAllSelections}
                    className="text-xs font-bold text-brand-tomato hover:underline cursor-pointer"
                  >
                    {parsedItems.every(i => selectedItemIds[i.id]) ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider bg-zinc-50/30 dark:bg-zinc-900/30">
                      <th className="py-3 px-4 w-12 text-center">Sel</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Produto no iFood</th>
                      <th className="py-3 px-4 text-right">Qtd Vendida</th>
                      <th className="py-3 px-4 text-right">Preço de Venda</th>
                      <th className="py-3 px-4">Match no Sistema</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                    {parsedItems.map((item) => {
                      const isSelected = !!selectedItemIds[item.id];
                      return (
                        <tr 
                          key={item.id}
                          className={`hover:bg-zinc-50/30 dark:hover:bg-zinc-800/10 transition-colors ${
                            !isSelected ? 'opacity-50' : ''
                          }`}
                        >
                          {/* Selection Checkbox */}
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItemSelection(item.id)}
                              className="rounded border-zinc-300 dark:border-zinc-700 text-brand-tomato focus:ring-brand-tomato cursor-pointer"
                            />
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            {item.status === 'update' ? (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-emerald-100/50 dark:border-emerald-900/20">
                                <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                                <span>Atualizar</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-brand-orange dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-100/50 dark:border-amber-900/20">
                                <Plus className="w-2.5 h-2.5" />
                                <span>Novo</span>
                              </span>
                            )}
                          </td>

                          {/* iFood Name */}
                          <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-white truncate max-w-[200px]" title={item.name}>
                            {item.name}
                          </td>

                          {/* Qty */}
                          <td className="py-3.5 px-4 text-right font-semibold font-mono text-zinc-700 dark:text-zinc-300">
                            {item.quantity} un
                          </td>

                          {/* Price */}
                          <td className="py-3.5 px-4 text-right font-semibold font-mono text-zinc-700 dark:text-zinc-300">
                            R$ {item.price.toFixed(2)}
                          </td>

                          {/* Matching Local Product */}
                          <td className="py-3.5 px-4 truncate max-w-[180px]">
                            {item.status === 'update' ? (
                              <span className="text-zinc-500 dark:text-zinc-400 flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span className="truncate">{item.matchedProductName}</span>
                              </span>
                            ) : (
                              <span className="text-zinc-400 dark:text-zinc-600 italic">
                                Cadastrar no sistema
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Import Actions Dashboard */}
            <div className="space-y-6 lg:sticky lg:top-24 h-fit">
              
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl p-5 shadow-sm space-y-5">
                <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Resumo da Importação
                </h3>

                {/* Stat Grid inside Box */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg text-center border border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 block">Total</span>
                    <strong className="text-base font-bold text-zinc-800 dark:text-zinc-200 font-mono mt-0.5 block">{stats.total}</strong>
                  </div>
                  <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-lg text-center border border-emerald-100/30 dark:border-emerald-900/30">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">Atualizar</span>
                    <strong className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">{stats.updateCount}</strong>
                  </div>
                  <div className="p-3 bg-brand-orange/5 dark:bg-brand-orange/10 rounded-lg text-center border border-brand-orange/10">
                    <span className="text-[10px] font-bold text-brand-orange block">Cadastrar</span>
                    <strong className="text-base font-bold text-brand-orange font-mono mt-0.5 block">{stats.newCount}</strong>
                  </div>
                </div>

                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-4">
                  {/* Category Selection for New Products */}
                  {stats.newCount > 0 && (
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Categoria dos Novos Produtos
                      </label>
                      <input
                        type="text"
                        value={newProductCategory}
                        onChange={(e) => setNewProductCategory(e.target.value)}
                        placeholder="Ex: iFood, Lanches, Bebidas"
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2 px-3 text-xs focus:ring-brand-tomato focus:border-brand-tomato font-medium"
                      />
                    </div>
                  )}

                  {/* Pricing Overwrite Option */}
                  {stats.updateCount > 0 && (
                    <label className="flex items-start space-x-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={updatePrices}
                        onChange={(e) => setUpdatePrices(e.target.checked)}
                        className="rounded border-zinc-300 dark:border-zinc-700 text-brand-tomato focus:ring-brand-tomato mt-0.5"
                      />
                      <span>Sobrescrever preços de venda de produtos existentes no sistema com valores do relatório</span>
                    </label>
                  )}
                </div>

                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={stats.selected === 0}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      stats.selected === 0
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 border border-zinc-200 dark:border-zinc-800 cursor-not-allowed shadow-none'
                        : 'bg-brand-tomato hover:bg-brand-tomato/95 text-white border border-brand-tomato shadow-sm'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Importar {stats.selected} Itens Selecionados</span>
                  </button>
                  <p className="text-[10px] text-center text-zinc-400 dark:text-zinc-500 mt-2.5">
                    Ao confirmar, os dados do Firestore serão sincronizados automaticamente em tempo real.
                  </p>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
