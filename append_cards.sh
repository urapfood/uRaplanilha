sed -i '/Sobra Semanal Líquida/{
n
n
n
n
n
n
n
a\
            <div className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-zinc-200/60 dark:border-zinc-700 shadow-sm flex flex-col justify-between">\
              <div>\
                <div className="flex items-center space-x-2.5 mb-3">\
                  <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-100 dark:border-emerald-800/50">\
                    <DollarSign className="w-4 h-4" />\
                  </div>\
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">\
                    Receitas Extras / Sem\
                  </p>\
                </div>\
                <h4 className="text-xl sm:text-2xl font-bold tech-font-mono font-mono text-emerald-600 break-words">\
                  {formatCurrency(weeklyMetrics.otherRevenues)}\
                </h4>\
              </div>\
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 border-t border-zinc-100/40 dark:border-zinc-700/40 pt-2">\
                Fração das receitas fora do iFood\
              </p>\
            </div>
}' src/components/ReportsTab.tsx
