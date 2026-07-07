import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Sparkles, 
  Check, 
  Loader2, 
  Building2, 
  Settings, 
  Download,
  Percent,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Product, Tax, FixedCost, Recipe } from '../types';
import { getProductCost, calculateProductMetrics } from '../utils';

interface PDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  taxes: Tax[];
  fixedCosts: FixedCost[];
  recipes: Recipe[];
}

interface ThemeConfig {
  name: string;
  primary: [number, number, number]; // RGB
  primaryHex: string;
  secondary: [number, number, number];
  bgLight: [number, number, number];
}

const THEMES: Record<string, ThemeConfig> = {
  ifood: {
    name: 'Vermelho iFood (Entrega)',
    primary: [239, 68, 68], // #ef4444
    primaryHex: '#ef4444',
    secondary: [185, 28, 28],
    bgLight: [254, 242, 242],
  },
  emerald: {
    name: 'Verde Lucro (Sucesso)',
    primary: [16, 185, 129], // #10b981
    primaryHex: '#10b981',
    secondary: [4, 120, 87],
    bgLight: [240, 253, 250],
  },
  blue: {
    name: 'Azul Corporativo',
    primary: [37, 99, 235], // #2563eb
    primaryHex: '#2563eb',
    secondary: [29, 78, 216],
    bgLight: [240, 249, 255],
  },
  charcoal: {
    name: 'Grafite Moderno',
    primary: [63, 63, 70], // #3f3f46
    primaryHex: '#3f3f46',
    secondary: [24, 24, 27],
    bgLight: [244, 244, 245],
  }
};

export default function PDFExportModal({
  isOpen,
  onClose,
  products,
  taxes,
  fixedCosts,
  recipes,
}: PDFExportModalProps) {
  const [businessName, setBusinessName] = useState('uRapFood Delivery');
  const [selectedTheme, setSelectedTheme] = useState<'ifood' | 'emerald' | 'blue' | 'charcoal'>('ifood');
  const [isGenerating, setIsGenerating] = useState(false);

  // Sections toggle
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeProducts, setIncludeProducts] = useState(true);
  const [includeFixedCosts, setIncludeFixedCosts] = useState(true);
  const [includeTaxes, setIncludeTaxes] = useState(true);
  const [includeRecipes, setIncludeRecipes] = useState(true);

  if (!isOpen) return null;

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    // Short timeout to let loader display
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const theme = THEMES[selectedTheme];
      let y = 20;
      const margin = 15;
      const pageWidth = 210;
      const contentWidth = pageWidth - (margin * 2);

      // Footer Helper
      let pageCount = 1;
      const drawHeaderFooter = (pageNum: number) => {
        // Draw top thin border
        doc.setDrawColor(theme.primary[0], theme.primary[1], theme.primary[2]);
        doc.setLineWidth(0.8);
        doc.line(margin, 12, pageWidth - margin, 12);

        // Header metadata
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(businessName.toUpperCase(), margin, 9);
        doc.text('uRaplanilha - Relatório de Gestão', pageWidth - margin - 50, 9, { align: 'right' });

        // Footer
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(margin, 282, pageWidth - margin, 282);
        doc.text(`Página ${pageNum}`, pageWidth - margin, 287, { align: 'right' });
        doc.text('Gerado em uRaplanilha - Todos os direitos reservados', margin, 287);
      };

      const checkPageOverflow = (neededHeight: number) => {
        if (y + neededHeight > 270) {
          drawHeaderFooter(pageCount);
          doc.addPage();
          pageCount++;
          y = 25; // Reset y with some padding
        }
      };

      // --- COVER PAGE / HEADLINE HEADER ---
      // Primary Cover Banner Rect
      doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2]);
      doc.rect(margin, y, contentWidth, 38, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text(businessName, margin + 8, y + 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('RELATÓRIO EXECUTIVO DE PRECIFICAÇÃO E DESEMPENHO FINANCEIRO', margin + 8, y + 23);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, margin + 8, y + 29);

      y += 48;

      // Active Tax Rate Calc
      const activeTaxRate = taxes.filter(t => t.active).reduce((sum, t) => sum + t.percentage, 0);

      // Financial calculations for summary
      const totalEstimatedSales = products.reduce((sum, p) => sum + (p.estimatedSales || 0), 0);
      const totalRevenue = products.reduce((sum, p) => sum + (p.sellingPrice * (p.estimatedSales || 0)), 0);
      const totalIngredientCost = products.reduce((sum, p) => {
        const cost = getProductCost(p);
        return sum + (cost * (p.estimatedSales || 0));
      }, 0);
      const totalTaxCost = (totalRevenue * activeTaxRate) / 100;
      const totalMonthlyFixedCost = fixedCosts.reduce((sum, f) => sum + f.monthlyValue, 0);
      
      const totalVariableCost = totalIngredientCost + totalTaxCost;
      const totalCost = totalVariableCost + totalMonthlyFixedCost;
      const netProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // --- SECTION 1: BUSINESS SUMMARY ---
      if (includeSummary) {
        checkPageOverflow(65);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(theme.secondary[0], theme.secondary[1], theme.secondary[2]);
        doc.text('1. RESUMO EXECUTIVO DO NEGÓCIO', margin, y);
        y += 6;

        // Visual divider
        doc.setDrawColor(theme.primary[0], theme.primary[1], theme.primary[2]);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        // Metric Boxes (2x2 grid layout)
        const boxWidth = (contentWidth - 6) / 2;
        const boxHeight = 16;

        const drawMetricBox = (mx: number, my: number, title: string, value: string, color: [number, number, number]) => {
          doc.setFillColor(theme.bgLight[0], theme.bgLight[1], theme.bgLight[2]);
          doc.roundedRect(mx, my, boxWidth, boxHeight, 2, 2, 'F');
          
          doc.setDrawColor(theme.primary[0], theme.primary[1], theme.primary[2]);
          doc.setLineWidth(0.1);
          doc.roundedRect(mx, my, boxWidth, boxHeight, 2, 2, 'S');

          // Left accent bar
          doc.setFillColor(color[0], color[1], color[2]);
          doc.rect(mx, my, 2.5, boxHeight, 'F');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(title.toUpperCase(), mx + 6, my + 5);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(30, 30, 30);
          doc.text(value, mx + 6, my + 11.5);
        };

        // Row 1
        drawMetricBox(margin, y, 'Faturamento Estimado Mensal', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue), theme.primary);
        drawMetricBox(margin + boxWidth + 6, y, 'Custo Mensal Estimado', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCost), [225, 29, 72]);
        y += boxHeight + 4;

        // Row 2
        const isProfit = netProfit >= 0;
        const profitColor: [number, number, number] = isProfit ? [16, 185, 129] : [239, 68, 68];
        drawMetricBox(margin, y, 'Resultado Líquido Estimado', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(netProfit) + (isProfit ? ' (Lucro)' : ' (Prejuízo)'), profitColor);
        drawMetricBox(margin + boxWidth + 6, y, 'Margem Líquida Geral', profitMargin.toFixed(1) + '%', profitColor);
        
        y += boxHeight + 8;
      }

      // --- SECTION 2: PRODUCTS TABLE ---
      if (includeProducts && products.length > 0) {
        checkPageOverflow(40);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(theme.secondary[0], theme.secondary[1], theme.secondary[2]);
        doc.text('2. PLANILHA DE PRODUTOS E PRECIFICAÇÃO', margin, y);
        y += 6;

        doc.setDrawColor(theme.primary[0], theme.primary[1], theme.primary[2]);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;

        // Table Header
        const colWidths = { name: 60, cost: 25, price: 28, sales: 22, margin: 25, netProfit: 20 };
        const headers = ['Produto', 'Custo (R$)', 'Venda (R$)', 'Vendas/mês', 'Margem (%)', 'Lucro (R$)'];
        
        doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2]);
        doc.rect(margin, y, contentWidth, 8, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);

        let curX = margin;
        doc.text(headers[0], curX + 3, y + 5.5); curX += colWidths.name;
        doc.text(headers[1], curX + colWidths.cost - 3, y + 5.5, { align: 'right' }); curX += colWidths.cost;
        doc.text(headers[2], curX + colWidths.price - 3, y + 5.5, { align: 'right' }); curX += colWidths.price;
        doc.text(headers[3], curX + colWidths.sales - 3, y + 5.5, { align: 'right' }); curX += colWidths.sales;
        doc.text(headers[4], curX + colWidths.margin - 3, y + 5.5, { align: 'right' }); curX += colWidths.margin;
        doc.text(headers[5], curX + colWidths.netProfit - 3, y + 5.5, { align: 'right' });

        y += 8;

        // Table Rows
        products.forEach((prod, idx) => {
          checkPageOverflow(8);
          
          // Alternating backgrounds
          const rowBg = idx % 2 === 0 ? 250 : 255;
          doc.setFillColor(rowBg, rowBg, rowBg);
          doc.rect(margin, y, contentWidth, 7, 'F');

          // Add a very light border to help readability
          doc.setDrawColor(230, 230, 230);
          doc.setLineWidth(0.1);
          doc.line(margin, y + 7, pageWidth - margin, y + 7);

          doc.setTextColor(50, 50, 50);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);

          const metrics = calculateProductMetrics(prod, activeTaxRate);

          curX = margin;
          // Product Name with truncation to avoid overflow
          let displayName = prod.name;
          if (displayName.length > 32) displayName = displayName.substring(0, 29) + '...';
          doc.text(displayName, curX + 3, y + 4.5); curX += colWidths.name;
          
          // Cost
          doc.text(metrics.cost.toFixed(2), curX + colWidths.cost - 3, y + 4.5, { align: 'right' }); curX += colWidths.cost;
          
          // Selling Price
          doc.setFont('helvetica', 'bold');
          doc.text(prod.sellingPrice.toFixed(2), curX + colWidths.price - 3, y + 4.5, { align: 'right' }); curX += colWidths.price;
          
          // Sales qty
          doc.setFont('helvetica', 'normal');
          doc.text(prod.estimatedSales.toString(), curX + colWidths.sales - 3, y + 4.5, { align: 'right' }); curX += colWidths.sales;
          
          // Margin
          const isMarginPositive = metrics.margin >= 0;
          doc.setTextColor(isMarginPositive ? 16 : 220, isMarginPositive ? 120 : 20, isMarginPositive ? 80 : 40);
          doc.setFont('helvetica', 'bold');
          doc.text(metrics.margin.toFixed(1) + '%', curX + colWidths.margin - 3, y + 4.5, { align: 'right' }); curX += colWidths.margin;
          
          // Net Profit
          doc.text(metrics.netProfit.toFixed(2), curX + colWidths.netProfit - 3, y + 4.5, { align: 'right' });

          y += 7;
        });

        y += 6; // Extra padding
      }

      // --- SECTION 3: FIXED COSTS & TAXES GRID ---
      if ((includeFixedCosts && fixedCosts.length > 0) || (includeTaxes && taxes.length > 0)) {
        checkPageOverflow(45);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(theme.secondary[0], theme.secondary[1], theme.secondary[2]);
        doc.text('3. DETALHAMENTO DE CUSTOS E TRIBUTOS', margin, y);
        y += 6;

        doc.setDrawColor(theme.primary[0], theme.primary[1], theme.primary[2]);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        const splitWidth = (contentWidth - 8) / 2;
        let leftY = y;
        let rightY = y;

        // LEFT COLUMN: Fixed Costs
        if (includeFixedCosts && fixedCosts.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(40, 40, 40);
          doc.text('CUSTOS FIXOS MENSAIS', margin, leftY);
          leftY += 5;

          // Header line
          doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2]);
          doc.rect(margin, leftY, splitWidth, 6, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7.5);
          doc.text('Descrição', margin + 3, leftY + 4);
          doc.text('Valor (R$)', margin + splitWidth - 3, leftY + 4, { align: 'right' });
          leftY += 6;

          fixedCosts.forEach((fc, idx) => {
            const rowBg = idx % 2 === 0 ? 250 : 255;
            doc.setFillColor(rowBg, rowBg, rowBg);
            doc.rect(margin, leftY, splitWidth, 6, 'F');
            doc.setTextColor(60, 60, 60);
            doc.setFont('helvetica', 'normal');
            doc.text(fc.name, margin + 3, leftY + 4);
            doc.text(fc.monthlyValue.toFixed(2), margin + splitWidth - 3, leftY + 4, { align: 'right' });
            leftY += 6;
          });

          // Fixed costs total row
          doc.setFillColor(theme.bgLight[0], theme.bgLight[1], theme.bgLight[2]);
          doc.rect(margin, leftY, splitWidth, 7, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 30, 30);
          doc.text('Total Custos Fixos', margin + 3, leftY + 4.5);
          doc.text(totalMonthlyFixedCost.toFixed(2), margin + splitWidth - 3, leftY + 4.5, { align: 'right' });
          leftY += 12;
        }

        // RIGHT COLUMN: Taxes
        if (includeTaxes && taxes.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(40, 40, 40);
          doc.text('TRIBUTOS E IMPOSTOS ATIVOS', margin + splitWidth + 8, rightY);
          rightY += 5;

          // Header line
          doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2]);
          doc.rect(margin + splitWidth + 8, rightY, splitWidth, 6, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7.5);
          doc.text('Imposto', margin + splitWidth + 11, rightY + 4);
          doc.text('Alíquota', margin + contentWidth - 3, rightY + 4, { align: 'right' });
          rightY += 6;

          taxes.forEach((tax, idx) => {
            const rowBg = idx % 2 === 0 ? 250 : 255;
            doc.setFillColor(rowBg, rowBg, rowBg);
            doc.rect(margin + splitWidth + 8, rightY, splitWidth, 6, 'F');
            doc.setTextColor(tax.active ? 60 : 150, tax.active ? 60 : 150, tax.active ? 60 : 150);
            doc.setFont('helvetica', tax.active ? 'normal' : 'italic');
            doc.text(tax.name + (tax.active ? '' : ' (Inativo)'), margin + splitWidth + 11, rightY + 4);
            doc.text(tax.percentage.toFixed(1) + '%', margin + contentWidth - 3, rightY + 4, { align: 'right' });
            rightY += 6;
          });

          // Taxes total row
          doc.setFillColor(theme.bgLight[0], theme.bgLight[1], theme.bgLight[2]);
          doc.rect(margin + splitWidth + 8, rightY, splitWidth, 7, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 30, 30);
          doc.text('Carga Tributária Ativa', margin + splitWidth + 11, rightY + 4.5);
          doc.text(activeTaxRate.toFixed(1) + '%', margin + contentWidth - 3, rightY + 4.5, { align: 'right' });
          rightY += 12;
        }

        // Align y with the tallest column
        y = Math.max(leftY, rightY) - 4;
      }

      // --- SECTION 4: RECIPES / FICHAS TÉCNICAS ---
      if (includeRecipes && recipes.length > 0) {
        checkPageOverflow(40);
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(theme.secondary[0], theme.secondary[1], theme.secondary[2]);
        doc.text('4. FICHAS TÉCNICAS E RECEITAS', margin, y);
        y += 6;

        doc.setDrawColor(theme.primary[0], theme.primary[1], theme.primary[2]);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        recipes.forEach((recipe, idx) => {
          checkPageOverflow(50);
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(theme.secondary[0], theme.secondary[1], theme.secondary[2]);
          doc.text(`${idx + 1}. ${recipe.productName}`, margin, y);
          y += 4.5;

          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8.5);
          doc.setTextColor(110, 110, 110);
          doc.text(`Porções/Rendimento: ${recipe.portions} porções`, margin, y);
          y += 6;

          // Double column for ingredients and prep method
          const blockWidth = (contentWidth - 8) / 2;
          let blockLeftY = y;
          let blockRightY = y;

          // Ingredients Block
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(60, 60, 60);
          doc.text('INGREDIENTES:', margin, blockLeftY);
          blockLeftY += 4;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(80, 80, 80);
          // Split ingredients text to fit column
          const splitIngredients = doc.splitTextToSize(recipe.ingredients || '', blockWidth);
          splitIngredients.forEach((line: string) => {
            if (blockLeftY > 270) return; // simple boundary protect
            doc.text(line, margin, blockLeftY);
            blockLeftY += 3.5;
          });

          // Prep Method Block
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(60, 60, 60);
          doc.text('MODO DE PREPARO:', margin + blockWidth + 8, blockRightY);
          blockRightY += 4;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(80, 80, 80);
          // Split prep text to fit column
          const splitPrep = doc.splitTextToSize(recipe.preparationMethod || '', blockWidth);
          splitPrep.forEach((line: string) => {
            if (blockRightY > 270) return;
            doc.text(line, margin + blockWidth + 8, blockRightY);
            blockRightY += 3.5;
          });

          y = Math.max(blockLeftY, blockRightY) + 8;
        });
      }

      // Draw footer on last page
      drawHeaderFooter(pageCount);

      // Save file
      const fileNameStr = businessName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      doc.save(`relatorio_${fileNameStr}.pdf`);
      
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGenerating(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        
        {/* Backdrop overlay */}
        <div 
          className="fixed inset-0 bg-zinc-950/40 dark:bg-zinc-950/70 backdrop-blur-xs transition-opacity" 
          onClick={onClose} 
        />

        {/* Modal body */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white dark:bg-zinc-900 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-zinc-200/80 dark:border-zinc-800">
          
          {/* Modal Header */}
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-brand-tomato/10 text-brand-tomato rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-white tracking-tight">
                  Exportar PDF Personalizado
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Gere relatórios elegantes e prontos para impressão.
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            
            {/* Input: Business Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>Nome da Empresa / Restaurante</span>
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ex: uRapFood Pizzaria, Meu Delivery"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2.5 px-3 text-sm focus:ring-brand-tomato focus:border-brand-tomato font-medium text-zinc-800 dark:text-zinc-200"
              />
            </div>

            {/* Colors / Themes selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Settings className="w-3.5 h-3.5" />
                <span>Tema Visual do Relatório</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {Object.entries(THEMES).map(([key, config]) => {
                  const isActive = selectedTheme === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedTheme(key as any)}
                      className={`py-2.5 px-3 border rounded-xl text-xs font-semibold flex items-center space-x-2 cursor-pointer transition-all ${
                        isActive 
                          ? 'border-brand-tomato bg-brand-tomato/5 text-zinc-950 dark:text-white font-bold'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      <span 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: config.primaryHex }}
                      />
                      <span className="truncate">{config.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checkboxes: Included sections */}
            <div className="space-y-2.5 border-t border-zinc-100 dark:border-zinc-800 pt-4">
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Seções para incluir no documento
              </label>
              
              <div className="space-y-2 text-xs">
                
                <label className="flex items-center space-x-3 text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSummary}
                    onChange={(e) => setIncludeSummary(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-700 text-brand-tomato focus:ring-brand-tomato"
                  />
                  <span>1. Resumo Executivo Financeiro (Receita, Custo e Margens)</span>
                </label>

                <label className="flex items-center space-x-3 text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeProducts}
                    onChange={(e) => setIncludeProducts(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-700 text-brand-tomato focus:ring-brand-tomato"
                  />
                  <span>2. Planilha Completa de Produtos e Precificação</span>
                </label>

                <label className="flex items-center space-x-3 text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeFixedCosts}
                    onChange={(e) => setIncludeFixedCosts(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-700 text-brand-tomato focus:ring-brand-tomato"
                  />
                  <span>3. Detalhamento de Custos Fixos Mensais</span>
                </label>

                <label className="flex items-center space-x-3 text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTaxes}
                    onChange={(e) => setIncludeTaxes(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-700 text-brand-tomato focus:ring-brand-tomato"
                  />
                  <span>4. Alíquotas de Impostos e Tributos Ativos</span>
                </label>

                <label className="flex items-center space-x-3 text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeRecipes}
                    onChange={(e) => setIncludeRecipes(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-700 text-brand-tomato focus:ring-brand-tomato"
                  />
                  <span>5. Fichas Técnicas e Modo de Preparo das Receitas</span>
                </label>

              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="bg-zinc-50 dark:bg-zinc-950 px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end space-x-3 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold uppercase tracking-wider rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGeneratePDF}
              disabled={isGenerating || (!includeSummary && !includeProducts && !includeFixedCosts && !includeTaxes && !includeRecipes)}
              className="px-5 py-2.5 bg-brand-tomato hover:bg-brand-tomato/95 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md flex items-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando Relatório...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Gerar Relatório PDF</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
