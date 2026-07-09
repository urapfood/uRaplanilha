import React, { useState } from 'react';
import { 
  Check, 
  Sparkles, 
  ChevronRight, 
  Store, 
  HelpCircle,
  Database,
  Info
} from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { Product, SupplierItem, Recipe, FixedCost } from '../types';

interface FoodQuizScreenProps {
  currentUser: any;
  userProfile: any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onComplete: () => void;
}

interface FoodSegment {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const FOOD_SEGMENTS: FoodSegment[] = [
  {
    id: 'hamburgueria',
    name: 'Hamburgueria',
    emoji: '🍔',
    description: 'Hambúrgueres artesanais, smash burgers, porções de fritas, maioneses temperadas e combos.',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20'
  },
  {
    id: 'pizzaria',
    name: 'Pizzaria',
    emoji: '🍕',
    description: 'Pizzas clássicas e especiais, calzones, bordas recheadas e fatias individuais.',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20'
  },
  {
    id: 'sushi',
    name: 'Sushi & Comida Oriental',
    emoji: '🍣',
    description: 'Sushis, temakis, sashimis, yakisobas e barcas combinadas de salmão e variados.',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20'
  },
  {
    id: 'pastelaria',
    name: 'Pastelaria',
    emoji: '🥟',
    description: 'Pastéis fritos na hora com diversos recheios salgados e doces, além de caldos de cana.',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20'
  },
  {
    id: 'acai',
    name: 'Açaí & Sorveteria',
    emoji: '🍧',
    description: 'Copos e barcas de açaí, sorvetes expressos, milkshakes, caldas e complementos.',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20'
  },
  {
    id: 'hotdog',
    name: 'Cachorro Quente / Hot Dog',
    emoji: '🌭',
    description: 'Dogs tradicionais, prensados na chapa, versões especiais de rua e complementos variados.',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20'
  },
  {
    id: 'geral',
    name: 'Restaurante / Outros',
    emoji: '🍽️',
    description: 'Pratos comerciais, marmitex, panquecas, porções diversas e alimentação geral.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20'
  }
];

// Helper to generate seed data for the chosen segment
function getSeedData(segmentId: string): {
  suppliers: SupplierItem[];
  products: Product[];
  recipes: Recipe[];
  fixedCosts: FixedCost[];
} {
  const timestamp = Date.now().toString();

  switch (segmentId) {
    case 'hamburgueria':
      return {
        suppliers: [
          { id: `sup-pao-${timestamp}`, name: 'Pão Brioche de Hambúrguer', unit: 'unidade', price: 1.50, supplierName: 'Panificadora Central' },
          { id: `sup-blend-${timestamp}`, name: 'Carne Moída Blend Bovino', unit: 'kg', price: 32.00, supplierName: 'Açougue Premium' },
          { id: `sup-queijo-${timestamp}`, name: 'Queijo Cheddar Fatiado', unit: 'kg', price: 42.00, supplierName: 'Distribuidora Lácteos' },
          { id: `sup-bacon-${timestamp}`, name: 'Bacon Fatiado Defumado', unit: 'kg', price: 38.00, supplierName: 'Açougue Premium' },
          { id: `sup-maionese-${timestamp}`, name: 'Maionese Temperada Verde', unit: 'kg', price: 18.00, supplierName: 'Produção Própria' },
          { id: `sup-emb-${timestamp}`, name: 'Embalagem de Papel Hamburgueria', unit: 'unidade', price: 0.60, supplierName: 'Papelaria Delivery' }
        ],
        products: [
          {
            id: `prod-burger-${timestamp}`,
            name: 'Burger Clássico Artesanal',
            category: 'Hambúrgueres',
            sellingPrice: 28.90,
            costType: 'detailed',
            singleCost: 0,
            packagingCost: 0.60,
            packagingSupplierItemId: `sup-emb-${timestamp}`,
            packagingQuantityUsed: 1,
            estimatedSales: 150,
            notes: 'Pão brioche macio, blend bovino suculento de 150g, queijo cheddar fatiado derretido e nossa maionese especial da casa.',
            ingredients: [
              { id: `ing-pao-${timestamp}`, name: 'Pão Brioche de Hambúrguer', cost: 1.50, supplierItemId: `sup-pao-${timestamp}`, quantityUsed: 1 },
              { id: `ing-blend-${timestamp}`, name: 'Carne Moída Blend Bovino', cost: 4.80, supplierItemId: `sup-blend-${timestamp}`, quantityUsed: 0.150 },
              { id: `ing-queijo-${timestamp}`, name: 'Queijo Cheddar Fatiado', cost: 1.26, supplierItemId: `sup-queijo-${timestamp}`, quantityUsed: 0.030 },
              { id: `ing-maio-${timestamp}`, name: 'Maionese Temperada Verde', cost: 0.36, supplierItemId: `sup-maionese-${timestamp}`, quantityUsed: 0.020 }
            ]
          },
          {
            id: `prod-bacon-${timestamp}`,
            name: 'Double Cheddar Bacon',
            category: 'Hambúrgueres',
            sellingPrice: 36.90,
            costType: 'detailed',
            singleCost: 0,
            packagingCost: 0.60,
            packagingSupplierItemId: `sup-emb-${timestamp}`,
            packagingQuantityUsed: 1,
            estimatedSales: 95,
            notes: 'Hambúrguer duplo com duas carnes de 150g, muito queijo cheddar fatiado e fatias crocantes de bacon defumado.',
            ingredients: [
              { id: `ing-pao-2-${timestamp}`, name: 'Pão Brioche de Hambúrguer', cost: 1.50, supplierItemId: `sup-pao-${timestamp}`, quantityUsed: 1 },
              { id: `ing-blend-2-${timestamp}`, name: 'Carne Moída Blend Bovino', cost: 9.60, supplierItemId: `sup-blend-${timestamp}`, quantityUsed: 0.300 },
              { id: `ing-queijo-2-${timestamp}`, name: 'Queijo Cheddar Fatiado', cost: 2.52, supplierItemId: `sup-queijo-${timestamp}`, quantityUsed: 0.060 },
              { id: `ing-bacon-${timestamp}`, name: 'Bacon Fatiado Defumado', cost: 1.52, supplierItemId: `sup-bacon-${timestamp}`, quantityUsed: 0.040 },
              { id: `ing-maio-2-${timestamp}`, name: 'Maionese Temperada Verde', cost: 0.36, supplierItemId: `sup-maionese-${timestamp}`, quantityUsed: 0.020 }
            ]
          }
        ],
        recipes: [
          {
            id: `rec-burger-${timestamp}`,
            productId: `prod-burger-${timestamp}`,
            productName: 'Burger Clássico Artesanal',
            portions: 1,
            ingredients: '1 Pão Brioche\n150g Blend de Carne Bovino\n30g Queijo Cheddar (2 fatias)\n20g Maionese Verde da Casa',
            preparationMethod: '1. Aqueça a chapa e passe manteiga no pão selando até dourar.\n2. Molde a carne e leve à chapa bem quente (grelhe por 3 min de um lado, vire).\n3. Adicione as duas fatias de cheddar sobre a carne e abafe com tampa para derreter.\n4. Monte aplicando maionese na base do pão, posicione o burger derretido e feche.'
          }
        ],
        fixedCosts: [
          { id: `fc-aluguel-${timestamp}`, name: 'Aluguel do Espaço', monthlyValue: 1200.00 },
          { id: `fc-luz-${timestamp}`, name: 'Energia Elétrica', monthlyValue: 350.00 },
          { id: `fc-internet-${timestamp}`, name: 'Internet & Telefones', monthlyValue: 120.00 }
        ]
      };

    case 'pizzaria':
      return {
        suppliers: [
          { id: `sup-trigo-${timestamp}`, name: 'Farinha de Trigo Premium', unit: 'kg', price: 6.50, supplierName: 'Atacado Farinhas' },
          { id: `sup-mussarela-${timestamp}`, name: 'Queijo Mussarela Rala', unit: 'kg', price: 34.00, supplierName: 'Distribuidora Lácteos' },
          { id: `sup-calabresa-${timestamp}`, name: 'Calabresa Defumada', unit: 'kg', price: 22.00, supplierName: 'Embutidos Sul' },
          { id: `sup-molho-${timestamp}`, name: 'Molho de Tomate Tradicional', unit: 'kg', price: 9.00, supplierName: 'Hortifruti' },
          { id: `sup-cxpizza-${timestamp}`, name: 'Caixa de Pizza Oitavada 35cm', unit: 'unidade', price: 1.80, supplierName: 'Embalagens Sul' }
        ],
        products: [
          {
            id: `prod-calabresa-${timestamp}`,
            name: 'Pizza de Calabresa G (8 fatias)',
            category: 'Pizzas',
            sellingPrice: 44.90,
            costType: 'detailed',
            singleCost: 0,
            packagingCost: 1.80,
            packagingSupplierItemId: `sup-cxpizza-${timestamp}`,
            packagingQuantityUsed: 1,
            estimatedSales: 120,
            notes: 'Massa artesanal fina fermentada por 24h, molho de tomate fresco, queijo mussarela fatiado, calabresa defumada de excelente qualidade e cebola fatiada.',
            ingredients: [
              { id: `ing-trigo-${timestamp}`, name: 'Farinha de Trigo Premium', cost: 1.30, supplierItemId: `sup-trigo-${timestamp}`, quantityUsed: 0.200 },
              { id: `ing-mussa-${timestamp}`, name: 'Queijo Mussarela Rala', cost: 10.20, supplierItemId: `sup-mussarela-${timestamp}`, quantityUsed: 0.300 },
              { id: `ing-cala-${timestamp}`, name: 'Calabresa Defumada', cost: 3.30, supplierItemId: `sup-calabresa-${timestamp}`, quantityUsed: 0.150 },
              { id: `ing-molho-${timestamp}`, name: 'Molho de Tomate Tradicional', cost: 0.90, supplierItemId: `sup-molho-${timestamp}`, quantityUsed: 0.100 }
            ]
          }
        ],
        recipes: [
          {
            id: `rec-calabresa-${timestamp}`,
            productId: `prod-calabresa-${timestamp}`,
            productName: 'Pizza de Calabresa G (8 fatias)',
            portions: 1,
            ingredients: '200g Massa de Pizza de Longa Fermentação\n100g Molho de Tomate Fresco\n300g Queijo Mussarela\n150g Calabresa Defumada fatiada\n50g Cebola cortada em rodelas finas\nOrégano a gosto',
            preparationMethod: '1. Abra a massa de pizza manualmente mantendo a borda mais alta.\n2. Espalhe o molho de tomate de forma homogênea.\n3. Distribua o queijo mussarela ralado por toda a superfície.\n4. Arrume as fatias de calabresa e as rodelas de cebola.\n5. Asse em forno de pizza a 350°C até que a borda esteja dourada e crocante.\n6. Finalize com orégano e coloque na embalagem oitavada.'
          }
        ],
        fixedCosts: [
          { id: `fc-gas-${timestamp}`, name: 'Gás de Cozinha Industrial', monthlyValue: 480.00 },
          { id: `fc-aluguel-${timestamp}`, name: 'Aluguel do Espaço', monthlyValue: 1500.00 },
          { id: `fc-luz-${timestamp}`, name: 'Energia Elétrica', monthlyValue: 400.00 }
        ]
      };

    case 'sushi':
      return {
        suppliers: [
          { id: `sup-arroz-${timestamp}`, name: 'Arroz Japonês Shari', unit: 'kg', price: 9.50, supplierName: 'Alimentos Oriente' },
          { id: `sup-salmon-${timestamp}`, name: 'Filé de Salmão Fresco', unit: 'kg', price: 85.00, supplierName: 'Peixaria Marítima' },
          { id: `sup-cream-${timestamp}`, name: 'Cream Cheese Original', unit: 'kg', price: 36.00, supplierName: 'Distribuidora Lácteos' },
          { id: `sup-nori-${timestamp}`, name: 'Alga Nori Premium (Folhas)', unit: 'unidade', price: 0.40, supplierName: 'Alimentos Oriente' },
          { id: `sup-boxsushi-${timestamp}`, name: 'Barca Delivery Grande', unit: 'unidade', price: 2.50, supplierName: 'Embalagens Sul' }
        ],
        products: [
          {
            id: `prod-combo-${timestamp}`,
            name: 'Combo Salmão Completo (20 peças)',
            category: 'Combos de Sushi',
            sellingPrice: 69.90,
            costType: 'detailed',
            singleCost: 0,
            packagingCost: 2.50,
            packagingSupplierItemId: `sup-boxsushi-${timestamp}`,
            packagingQuantityUsed: 1,
            estimatedSales: 80,
            notes: 'Seleção impecável contendo 5 sashimis de salmão, 5 hossomakis de salmão, 5 uramakis philadelphia e 5 jotas/temakis salmão.',
            ingredients: [
              { id: `ing-arroz-${timestamp}`, name: 'Arroz Japonês Shari', cost: 1.43, supplierItemId: `sup-arroz-${timestamp}`, quantityUsed: 0.150 },
              { id: `ing-salmon-${timestamp}`, name: 'Filé de Salmão Fresco', cost: 17.00, supplierItemId: `sup-salmon-${timestamp}`, quantityUsed: 0.200 },
              { id: `ing-cream-${timestamp}`, name: 'Cream Cheese Original', cost: 1.80, supplierItemId: `sup-cream-${timestamp}`, quantityUsed: 0.050 },
              { id: `ing-nori-${timestamp}`, name: 'Alga Nori Premium (Folhas)', cost: 0.80, supplierItemId: `sup-nori-${timestamp}`, quantityUsed: 2 }
            ]
          }
        ],
        recipes: [
          {
            id: `rec-combo-${timestamp}`,
            productId: `prod-combo-${timestamp}`,
            productName: 'Combo Salmão Completo (20 peças)',
            portions: 1,
            ingredients: '150g Arroz Shari temperado\n200g Salmão Fresco limpo\n50g Cream Cheese\n2 folhas de Alga Nori',
            preparationMethod: '1. Fatie 5 fatias finas para Sashimi.\n2. Monte os Uramakis com arroz por fora, gergelim e recheio de salmão e cream cheese.\n3. Monte os Hossomakis com alga por fora, arroz e salmão.\n4. Monte os niguiris pressionando o arroz e cobrindo com uma fatia de salmão.\n5. Monte na barca higienizada acompanhado de hashi e sachês.'
          }
        ],
        fixedCosts: [
          { id: `fc-luz-${timestamp}`, name: 'Energia Elétrica (Câmaras Frias)', monthlyValue: 650.00 },
          { id: `fc-aluguel-${timestamp}`, name: 'Aluguel do Espaço', monthlyValue: 1800.00 }
        ]
      };

    case 'pastelaria':
      return {
        suppliers: [
          { id: `sup-massa-${timestamp}`, name: 'Massa de Pastel Pronta Rolo', unit: 'kg', price: 9.80, supplierName: 'Massas Sul' },
          { id: `sup-carne-${timestamp}`, name: 'Carne Moída Patinho Recheio', unit: 'kg', price: 34.00, supplierName: 'Açougue Premium' },
          { id: `sup-oleo-${timestamp}`, name: 'Óleo de Cozinha (Soja)', unit: 'unidade', price: 6.20, supplierName: 'Atacado Geral' },
          { id: `sup-sacola-${timestamp}`, name: 'Embalagem Sacola de Papel Pardo', unit: 'unidade', price: 0.35, supplierName: 'Embalagens Sul' }
        ],
        products: [
          {
            id: `prod-pastelcarne-${timestamp}`,
            name: 'Pastel de Carne Especial',
            category: 'Pastéis Salgados',
            sellingPrice: 12.00,
            costType: 'detailed',
            singleCost: 0,
            packagingCost: 0.35,
            packagingSupplierItemId: `sup-sacola-${timestamp}`,
            packagingQuantityUsed: 1,
            estimatedSales: 220,
            notes: 'Massa crocante frita na hora, recheio generoso de carne moída bem temperada com ovos cozidos e azeitonas picadas.',
            ingredients: [
              { id: `ing-massa-${timestamp}`, name: 'Massa de Pastel Pronta Rolo', cost: 0.98, supplierItemId: `sup-massa-${timestamp}`, quantityUsed: 0.100 },
              { id: `ing-carne-${timestamp}`, name: 'Carne Moída Patinho Recheio', cost: 2.72, supplierItemId: `sup-carne-${timestamp}`, quantityUsed: 0.080 },
              { id: `ing-oleo-${timestamp}`, name: 'Óleo de Cozinha (Soja)', cost: 0.31, supplierItemId: `sup-oleo-${timestamp}`, quantityUsed: 0.050 }
            ]
          }
        ],
        recipes: [
          {
            id: `rec-pastelcarne-${timestamp}`,
            productId: `prod-pastelcarne-${timestamp}`,
            productName: 'Pastel de Carne Especial',
            portions: 1,
            ingredients: '100g Massa de Pastel de Rolo\n80g Recheio de Carne Refogada\nÓleo para fritar quente',
            preparationMethod: '1. Abra a massa em uma superfície limpa e coloque 80g de carne refogada.\n2. Feche o pastel pressionando bem as bordas com o cortador de pastel.\n3. Frite em óleo limpo e preaquecido a 180°C por cerca de 2 minutos de cada lado até ficar bem dourado e com bolhas.\n4. Escorra e embale no papel pardo.'
          }
        ],
        fixedCosts: [
          { id: `fc-gas-${timestamp}`, name: 'Gás de Cozinha', monthlyValue: 280.00 },
          { id: `fc-aluguel-${timestamp}`, name: 'Aluguel do Box', monthlyValue: 800.00 }
        ]
      };

    case 'acai':
      return {
        suppliers: [
          { id: `sup-acai-${timestamp}`, name: 'Açaí Mix Balde 10L', unit: 'kg', price: 16.00, supplierName: 'Açaí Distribuidora' },
          { id: `sup-leitepo-${timestamp}`, name: 'Leite em Pó integral', unit: 'kg', price: 29.00, supplierName: 'Atacado Alimentos' },
          { id: `sup-leitecond-${timestamp}`, name: 'Leite Condensado Moça', unit: 'kg', price: 18.00, supplierName: 'Atacado Alimentos' },
          { id: `sup-copo-${timestamp}`, name: 'Copo 500ml de Plástico + Tampa', unit: 'unidade', price: 0.55, supplierName: 'Embalagens Sul' }
        ],
        products: [
          {
            id: `prod-acai500-${timestamp}`,
            name: 'Copo de Açaí 500ml Completo',
            category: 'Copo de Açaí',
            sellingPrice: 22.00,
            costType: 'detailed',
            singleCost: 0,
            packagingCost: 0.55,
            packagingSupplierItemId: `sup-copo-${timestamp}`,
            packagingQuantityUsed: 1,
            estimatedSales: 180,
            notes: 'Delicioso açaí cremoso no copo de 500ml acompanhado por camadas fartas de leite em pó, leite condensado e banana fatiada.',
            ingredients: [
              { id: `ing-acai-${timestamp}`, name: 'Açaí Mix Balde 10L', cost: 4.80, supplierItemId: `sup-acai-${timestamp}`, quantityUsed: 0.300 },
              { id: `ing-leitepo-${timestamp}`, name: 'Leite em Pó integral', cost: 0.87, supplierItemId: `sup-leitepo-${timestamp}`, quantityUsed: 0.030 },
              { id: `ing-leitecond-${timestamp}`, name: 'Leite Condensado Moça', cost: 0.90, supplierItemId: `sup-leitecond-${timestamp}`, quantityUsed: 0.050 }
            ]
          }
        ],
        recipes: [
          {
            id: `rec-acai500-${timestamp}`,
            productId: `prod-acai500-${timestamp}`,
            productName: 'Copo de Açaí 500ml Completo',
            portions: 1,
            ingredients: '300g de Creme de Açaí\n30g de Leite em Pó\n50g de Leite Condensado\nMeia banana fatiada',
            preparationMethod: '1. No copo de 500ml, monte uma camada de açaí cremoso no fundo.\n2. Adicione uma colher de leite em pó e uma generosa colher de leite condensado.\n3. Faça uma nova camada de açaí e adicione as bananas fatiadas.\n4. Complete com o restante do açaí, decore com mais leite em pó e leite condensado no topo, tampe e coloque a colher descartável.'
          }
        ],
        fixedCosts: [
          { id: `fc-luz-${timestamp}`, name: 'Energia Elétrica (Freezers)', monthlyValue: 550.00 },
          { id: `fc-aluguel-${timestamp}`, name: 'Aluguel do Ponto', monthlyValue: 1100.00 }
        ]
      };

    case 'hotdog':
      return {
        suppliers: [
          { id: `sup-paodog-${timestamp}`, name: 'Pão de Hot Dog de Chapa', unit: 'unidade', price: 0.85, supplierName: 'Panificadora Central' },
          { id: `sup-salsicha-${timestamp}`, name: 'Salsicha de Carne Bovino/Frango', unit: 'kg', price: 11.50, supplierName: 'Atacado Frios' },
          { id: `sup-palha-${timestamp}`, name: 'Batata Palha Crocante', unit: 'kg', price: 26.00, supplierName: 'Atacado Frios' },
          { id: `sup-sacoladog-${timestamp}`, name: 'Sacola Térmica de Hotdog', unit: 'unidade', price: 0.45, supplierName: 'Embalagens Sul' }
        ],
        products: [
          {
            id: `prod-dogcompleto-${timestamp}`,
            name: 'Hot Dog Duplo Completo Prensa',
            category: 'Cachorros Quentes',
            sellingPrice: 16.90,
            costType: 'detailed',
            singleCost: 0,
            packagingCost: 0.45,
            packagingSupplierItemId: `sup-sacoladog-${timestamp}`,
            packagingQuantityUsed: 1,
            estimatedSales: 160,
            notes: 'Pão de hotdog de chapa recheado com 2 salsichas, molho de tomate temperado especial, milho, maionese artesanal e muita batata palha prensado quente.',
            ingredients: [
              { id: `ing-paodog-${timestamp}`, name: 'Pão de Hot Dog de Chapa', cost: 0.85, supplierItemId: `sup-paodog-${timestamp}`, quantityUsed: 1 },
              { id: `ing-salsicha-${timestamp}`, name: 'Salsicha de Carne Bovino/Frango', cost: 1.15, supplierItemId: `sup-salsicha-${timestamp}`, quantityUsed: 0.100 },
              { id: `ing-palha-${timestamp}`, name: 'Batata Palha Crocante', cost: 0.52, supplierItemId: `sup-palha-${timestamp}`, quantityUsed: 0.020 }
            ]
          }
        ],
        recipes: [
          {
            id: `rec-dogcompleto-${timestamp}`,
            productId: `prod-dogcompleto-${timestamp}`,
            productName: 'Hot Dog Duplo Completo Prensa',
            portions: 1,
            ingredients: '1 Pão de Hotdog\n2 Salsichas quentes cozidas no molho\n30g de Batata Palha\nMolho de tomate de cobertura\nCondimentos',
            preparationMethod: '1. Abra o pão ao meio, passe maionese na chapa levemente para selar.\n2. Insira as 2 salsichas quentes.\n3. Complete com os acompanhamentos desejados e adicione a batata palha.\n4. Feche o hotdog e leve à prensa de chapa até ficar quentinho e levemente prensado.\n5. Embale no saco térmico descartável.'
          }
        ],
        fixedCosts: [
          { id: `fc-gas-${timestamp}`, name: 'Gás de Cozinha Chapa', monthlyValue: 250.00 },
          { id: `fc-aluguel-${timestamp}`, name: 'Aluguel do Carrinho/Ponto', monthlyValue: 500.00 }
        ]
      };

    default: // geral
      return {
        suppliers: [
          { id: `sup-arrozg-${timestamp}`, name: 'Arroz Branco Agulhinha', unit: 'kg', price: 6.20, supplierName: 'Atacado Alimentos' },
          { id: `sup-feijao-${timestamp}`, name: 'Feijão Carioca Tipo 1', unit: 'kg', price: 8.50, supplierName: 'Atacado Alimentos' },
          { id: `sup-carnesol-${timestamp}`, name: 'Carne de Sol de Traseiro', unit: 'kg', price: 42.00, supplierName: 'Açougue Premium' },
          { id: `sup-isopor-${timestamp}`, name: 'Marmita Isopor Grande PT-100', unit: 'unidade', price: 0.80, supplierName: 'Embalagens Sul' }
        ],
        products: [
          {
            id: `prod-marmita-${timestamp}`,
            name: 'Marmitex Executivo Carne de Sol',
            category: 'Pratos & Marmitas',
            sellingPrice: 24.90,
            costType: 'detailed',
            singleCost: 0,
            packagingCost: 0.80,
            packagingSupplierItemId: `sup-isopor-${timestamp}`,
            packagingQuantityUsed: 1,
            estimatedSales: 130,
            notes: 'Marmitex tamanho grande bem servido com arroz branco soltinho, feijão temperado, carne de sol frita acebolada e porção de batatas fritas.',
            ingredients: [
              { id: `ing-arrozg-${timestamp}`, name: 'Arroz Branco Agulhinha', cost: 0.93, supplierItemId: `sup-arrozg-${timestamp}`, quantityUsed: 0.150 },
              { id: `ing-feijao-${timestamp}`, name: 'Feijão Carioca Tipo 1', cost: 0.68, supplierItemId: `sup-feijao-${timestamp}`, quantityUsed: 0.080 },
              { id: `ing-carnesol-${timestamp}`, name: 'Carne de Sol de Traseiro', cost: 6.30, supplierItemId: `sup-carnesol-${timestamp}`, quantityUsed: 0.150 }
            ]
          }
        ],
        recipes: [
          {
            id: `rec-marmita-${timestamp}`,
            productId: `prod-marmita-${timestamp}`,
            productName: 'Marmitex Executivo Carne de Sol',
            portions: 1,
            ingredients: '150g Arroz Branco cozido\n80g Feijão Carioca caldo consistente\n150g Carne de Sol acebolada grelhada\nEmbalagem de Isopor Grande',
            preparationMethod: '1. No fundo do isopor, monte a base de arroz branco de forma nivelada.\n2. Coloque o feijão de preferência em um dos lados ou utilize divisor.\n3. Finalize com a carne de sol grelhada na chapa acebolada por cima.\n4. Feche a embalagem mantendo aquecido.'
          }
        ],
        fixedCosts: [
          { id: `fc-aluguel-${timestamp}`, name: 'Aluguel Comercial', monthlyValue: 1400.00 },
          { id: `fc-luz-${timestamp}`, name: 'Energia Elétrica', monthlyValue: 450.00 },
          { id: `fc-gas-${timestamp}`, name: 'Gás de Cozinha', monthlyValue: 390.00 }
        ]
      };
  }
}

export default function FoodQuizScreen({ currentUser, userProfile, showToast, onComplete }: FoodQuizScreenProps) {
  const [selectedSegment, setSelectedSegment] = useState<string>('hamburgueria');
  const [saving, setSaving] = useState<boolean>(false);

  const handleFinishOnboarding = async () => {
    if (!selectedSegment) {
      showToast('Por favor, selecione seu tipo de comida ou lanche.', 'error');
      return;
    }

    setSaving(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      
      // Update the user profile doc with segment info
      const segmentDetails = FOOD_SEGMENTS.find(s => s.id === selectedSegment);
      await setDoc(userRef, {
        foodType: selectedSegment,
        foodSegmentName: segmentDetails?.name || 'Geral',
        onboardingCompleted: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Clean all user collections to ensure a completely clean start as requested
      const collectionsToClear = ['products', 'suppliers', 'recipes', 'fixedCosts', 'variableCosts', 'otherRevenues', 'sales'];
      for (const colName of collectionsToClear) {
        try {
          const colRef = collection(db, 'users', currentUser.uid, colName);
          const snapshot = await getDocs(colRef);
          for (const docSnap of snapshot.docs) {
            await deleteDoc(docSnap.ref);
          }
        } catch (colErr) {
          console.error(`Error clearing collection ${colName}:`, colErr);
        }
      }

      showToast(`Seu painel de ${segmentDetails?.name} foi configurado 100% limpo com sucesso!`, 'success');
      onComplete();
    } catch (err: any) {
      console.error('Onboarding Setup Error:', err);
      showToast('Erro ao configurar seu segmento de negócio. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const currentSegmentData = FOOD_SEGMENTS.find(s => s.id === selectedSegment);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 transition-colors duration-300">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row gap-8">
        {/* Top orange status gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-tomato to-orange-500"></div>

        {/* Content columns */}
        <div className="flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-tomato/10 text-brand-tomato rounded-full text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personalizar Painel</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white tracking-tight leading-none">
              Qual comida ou lanche você vai vender?
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              Olá, <strong className="text-zinc-900 dark:text-white">{userProfile?.name || currentUser.displayName || 'Parceiro'}</strong>! Selecione abaixo seu segmento para podermos adaptar as sugestões e comportamento da sua uRaplanilha.
            </p>
          </div>

          {/* Segment cards grid list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
            {FOOD_SEGMENTS.map((segment) => {
              const isSelected = selectedSegment === segment.id;
              return (
                <button
                  key={segment.id}
                  onClick={() => setSelectedSegment(segment.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex gap-3.5 items-start ${
                    isSelected 
                      ? 'bg-brand-tomato/5 border-brand-tomato shadow-xs ring-1 ring-brand-tomato/10' 
                      : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-850'
                  }`}
                  id={`segment-${segment.id}`}
                >
                  <div className={`text-2xl p-2.5 rounded-xl ${segment.bgColor} border ${segment.borderColor} flex items-center justify-center shrink-0`}>
                    {segment.emoji}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs text-zinc-900 dark:text-white">{segment.name}</p>
                      {isSelected && (
                        <div className="p-0.5 bg-brand-tomato text-white rounded-full shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal line-clamp-2">
                      {segment.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Info feedback based on choice */}
          {currentSegmentData && (
            <div className="bg-zinc-50 dark:bg-zinc-850/40 border border-zinc-200/50 dark:border-zinc-800/60 rounded-2xl p-4 flex gap-3 text-left">
              <Store className="w-5 h-5 text-brand-tomato shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  Configuração para {currentSegmentData.name} {currentSegmentData.emoji}
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                  A planilha irá sugerir taxas, custos operacionais e fórmulas ideais para esse segmento. Seu estoque e painel serão personalizados com as tabelas totalmente limpas para você começar.
                </p>
              </div>
            </div>
          )}

          {/* Button Footer */}
          <button
            onClick={handleFinishOnboarding}
            disabled={saving}
            className="w-full bg-brand-tomato hover:bg-brand-tomato/95 text-white py-4 rounded-2xl font-black text-sm tracking-wide shadow-md shadow-brand-tomato/15 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <span>Configurando Painel Limpo...</span>
            ) : (
              <>
                <span>Ativar Meu Painel uRaplanilha (100% Limpo)</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
