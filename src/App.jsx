import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Play,
  Upload,
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
  MinusCircle,
  Clock,
  Calendar,
  BarChart2,
  ArrowLeft
} from 'lucide-react';

// --- Default Data for Demonstration ---
const DEMO_TEXT = `
Pergunta 1
Correto
Your organization requires connecting to an on-premises Teradata data warehouse from Cloud Data Fusion to migrate data to BigQuery. The Teradata connector is not visible in the plugin palette on the Studio page. You need to make the Teradata connector available for building the migration pipeline. What should you do?
Sua resposta está correta
Navigate to the Hub in the Cloud Data Fusion web interface, find the Teradata plugin, and deploy it to the current namespace.
Explicação
Correct because Cloud Data Fusion has plugins installed by default, but additional plugins can be deployed from the Hub. When you deploy a plugin from the Hub, it appears in the plugin palette on the Studio page in the namespace where you initiated the download. Reference: https://cloud.google.com/data-fusion/docs/how-to/deploy-a-plugin
Download the Teradata JDBC driver JAR file and upload it directly to the Cloud Data Fusion instance storage bucket.
Explicação
Incorrect because simply uploading a JDBC driver does not deploy the plugin. You must deploy the Teradata plugin from the Hub, which includes the connector functionality. JDBC drivers may be uploaded separately for database plugins, but the plugin itself must be deployed first. Reference: https://cloud.google.com/data-fusion/docs/how-to/deploy-a-plugin
Export a pipeline configuration JSON that includes the Teradata plugin from another namespace and import it into the current namespace.
Explicação
Incorrect because plugins deployed from the Hub are namespace-specific and are not automatically available to other namespaces. You would need to deploy the plugin separately in each namespace where it is required. Reference: https://cloud.google.com/data-fusion/docs/how-to/deploy-a-plugin
Create a new Cloud Data Fusion instance with the Enterprise edition, which includes all available connectors by default.
Explicação
Incorrect because the Cloud Data Fusion edition does not determine which plugins are available in the palette. Additional plugins beyond the default set must be deployed from the Hub regardless of the edition. Reference: https://cloud.google.com/data-fusion/docs/how-to/deploy-a-plugin
Domínio
Ingesting and processing the data
Pergunta 2
Correto
Your organization runs a complex data pipeline in Cloud Composer where DAG_A processes customer data and stores results in Cloud Storage, followed by DAG_B that must transform those results once DAG_A completes successfully. Both DAGs run in the same Cloud Composer environment. You want to implement this dependency following Google-recommended practices. What should you do?
Schedule both DAGs with the same cron expression and add a time buffer between them to ensure DAG_A finishes first.
Explicação
Incorrect because using time buffers is unreliable and does not guarantee proper execution order. If DAG_A runs longer than expected, DAG_B might start before DAG_A completes, causing data inconsistency issues. Reference: https://cloud.google.com/composer/docs/composer-3/write-dags
Create a SubDAG within DAG_A that contains all tasks from DAG_B to ensure proper execution order.
Explicação
Incorrect because SubDAGs are deprecated in Airflow due to performance and functional issues. Google recommends avoiding SubDAGs and instead using alternative approaches like TriggerDagRunOperator or TaskGroup. Reference: https://cloud.google.com/composer/docs/composer-2/group-tasks-inside-dags
Sua resposta está correta
Use TriggerDagRunOperator at the end of DAG_A to trigger DAG_B after successful completion.
Explicação
Correct because TriggerDagRunOperator is the recommended approach for triggering one DAG after another within the same environment. When DAG_B depends on DAG_A completing, placing TriggerDagRunOperator at the end of DAG_A ensures DAG_B starts only after DAG_A succeeds. Reference: https://cloud.google.com/composer/docs/composer-3/write-dags
Combine DAG_A and DAG_B into a single large DAG with all tasks to eliminate the need for cross-DAG dependencies.
Explicação
Incorrect because while merging tightly integrated DAGs is sometimes appropriate, it is not always the best solution. Large monolithic DAGs become harder to maintain, test, and debug. Using TriggerDagRunOperator provides better modularity while maintaining proper dependencies. Reference: https://cloud.google.com/composer/docs/composer-2/group-tasks-inside-dags
Domínio
Ingesting and processing the data
`;

// --- Helpers ---
const formatDate = (date) => {
  return new Intl.DateTimeFormat('pt-BR', { 
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(date);
};

const formatDuration = (ms) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes} min ${seconds} s`;
};

// --- Parser Logic ---
const parseQuizText = (text) => {
  if (!text) return [];

  const normalizedText = text.replace(/\r\n/g, '\n');
  const rawChunks = normalizedText.split(/(?=Pergunta \d+)/);
  
  const questions = rawChunks
    .filter(chunk => chunk.trim().length > 0)
    .map((chunk, index) => {
      try {
        const lines = chunk.trim().split('\n').map(l => l.trim()).filter(l => l);
        const header = lines[0];
        
        let domain = "Geral"; // Default domain
        const domainIndex = lines.findIndex(l => l.toLowerCase().startsWith('domínio'));
        let contentLines = lines;
        
        if (domainIndex !== -1) {
          domain = lines.slice(domainIndex + 1).join(' ').trim();
          contentLines = lines.slice(0, domainIndex);
        }

        let startIndex = 1;
        while(startIndex < contentLines.length && 
             (contentLines[startIndex].toLowerCase() === 'correto' || 
              contentLines[startIndex].toLowerCase() === 'incorreto')) {
          startIndex++;
        }
        
        const fullContent = contentLines.slice(startIndex).join('\n');
        const parts = fullContent.split(/Explicação/i);
        
        if (parts.length < 2) return null; 

        const options = [];
        let questionText = "";

        const processPartForOption = (textSegment, isFirstPart = false) => {
           let cleanSegment = textSegment.trim();
           let isCorrect = false;

           if (cleanSegment.includes('Sua resposta está correta') || cleanSegment.includes('Sua resposta está incorreta')) {
             if (cleanSegment.includes('Sua resposta está correta')) isCorrect = true;
             cleanSegment = cleanSegment.replace(/Sua resposta está correta/gi, '')
                                        .replace(/Sua resposta está incorreta/gi, '')
                                        .trim();
           }

           if (isFirstPart) {
             const paragraphs = cleanSegment.split('\n');
             if (paragraphs.length > 1) {
                const optText = paragraphs.pop(); 
                questionText = paragraphs.join('\n'); 
                return { text: optText, isCorrect };
             } else {
               return { text: cleanSegment, isCorrect }; 
             }
           } else {
             const lines = cleanSegment.split('\n');
             const refIndex = lines.findIndex(l => l.includes('Reference:'));
             
             if (refIndex !== -1) {
                const expl = lines.slice(0, refIndex + 1).join('\n');
                const opt = lines.slice(refIndex + 1).join('\n');
                if (opt.toLowerCase().includes('sua resposta está correta')) isCorrect = true;
                const finalOpt = opt.replace(/Sua resposta está correta/gi, '').replace(/Sua resposta está incorreta/gi, '').trim();
                return { explanation: expl, nextOptionText: finalOpt, isCorrectNext: isCorrect };
             } else {
                const nextOpt = lines.pop();
                const expl = lines.join('\n');
                 if (nextOpt && nextOpt.toLowerCase().includes('sua resposta está correta')) isCorrect = true;
                const finalOpt = nextOpt ? nextOpt.replace(/Sua resposta está correta/gi, '').replace(/Sua resposta está incorreta/gi, '').trim() : '';
                return { explanation: expl, nextOptionText: finalOpt, isCorrectNext: isCorrect };
             }
           }
        };

        const firstBlock = processPartForOption(parts[0], true);
        options.push({ id: 0, text: firstBlock.text, isCorrect: firstBlock.isCorrect, explanation: '' });

        for (let i = 1; i < parts.length; i++) {
           const result = processPartForOption(parts[i]);
           if (options[i-1]) options[i-1].explanation = result.explanation;
           if (i < parts.length && result.nextOptionText) {
                options.push({ id: i, text: result.nextOptionText, isCorrect: result.isCorrectNext, explanation: '' });
           }
        }

        return { id: index + 1, header: header, text: questionText, options: options, domain: domain };
      } catch (e) {
        return null;
      }
    })
    .filter(q => q !== null);
    
  return questions;
};

// --- Components ---

const DonutChart = ({ correct, total, size = 160 }) => {
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const incorrect = total - correct;
  const incorrectPercentage = 100 - percentage;
  
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(#4ade80 0% ${percentage}%, #f87171 ${percentage}% 100%)`
        }}
      ></div>
      <div className="absolute bg-white rounded-full flex flex-col items-center justify-center" style={{ inset: '10px' }}>
          {/* Inner content */}
      </div>
    </div>
  );
};

const ResultsDashboard = ({ history, onReviewAttempt, onBackToInput }) => {
  // Show most recent attempt by default
  const latestAttempt = history[history.length - 1];
  
  if (!latestAttempt) return null;

  // Calculate domains
  const domainStats = {};
  latestAttempt.questions.forEach((q, idx) => {
      const status = latestAttempt.answers[idx]?.status || 'ignored';
      if (!domainStats[q.domain]) {
          domainStats[q.domain] = { total: 0, correct: 0, incorrect: 0, ignored: 0 };
      }
      domainStats[q.domain].total++;
      if (status === 'correct') domainStats[q.domain].correct++;
      else if (status === 'incorrect') domainStats[q.domain].incorrect++;
      else domainStats[q.domain].ignored++;
  });

  return (
    <div className="max-w-4xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="mb-6 flex items-center justify-between">
         <button onClick={onBackToInput} className="text-gray-500 hover:text-purple-600 flex items-center text-sm font-medium">
            <ArrowLeft size={16} className="mr-1"/> Voltar ao início
         </button>
         <h1 className="text-2xl font-bold text-gray-900">Resultados</h1>
      </div>

      {/* History List (Collapsed Items) */}
      <div className="space-y-3 mb-8">
        {history.slice(0, -1).reverse().map((attempt) => (
            <div key={attempt.id} className="bg-white border rounded-lg p-4 flex items-center justify-between shadow-sm opacity-70 hover:opacity-100 transition-opacity">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full border-4 border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                     {Math.round((attempt.score / attempt.total) * 100)}%
                  </div>
                  <div>
                      <div className="text-sm font-bold text-gray-800">Tentativa {attempt.id}</div>
                      <div className="text-xs text-gray-500">{formatDate(attempt.date)}</div>
                  </div>
               </div>
               <div className="text-sm text-gray-600">{formatDuration(attempt.duration)}</div>
            </div>
        ))}
      </div>

      {/* Current Attempt Main Card */}
      <div className="bg-white border rounded-xl shadow-sm p-6 md:p-8 mb-8">
         <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Chart */}
            <div className="flex-shrink-0">
               <DonutChart correct={latestAttempt.score} total={latestAttempt.total} size={180} />
            </div>

            {/* Text Stats */}
            <div className="flex-1 w-full">
               <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded inline-block text-xs font-bold uppercase tracking-wider mb-2">
                 Tentativa {latestAttempt.id}
               </div>
               <h2 className="text-4xl font-bold text-gray-900 mb-1">
                 {Math.round((latestAttempt.score / latestAttempt.total) * 100)}% <span className="text-lg font-normal text-gray-500">de acertos ({latestAttempt.score}/{latestAttempt.total})</span>
               </h2>
               <div className="text-gray-500 text-sm mb-6 flex flex-col gap-1">
                 <span>{formatDuration(latestAttempt.duration)}</span>
                 <span>{formatDate(latestAttempt.date)}</span>
               </div>
               
               <button 
                 onClick={() => onReviewAttempt(latestAttempt)}
                 className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors shadow-sm w-full md:w-auto"
               >
                 Revisar perguntas
               </button>
            </div>
         </div>

         {/* Legend */}
         <div className="flex gap-4 mt-8 text-xs font-medium text-gray-600">
            <div className="flex items-center"><div className="w-3 h-3 bg-green-400 rounded-sm mr-2"></div> Correto</div>
            <div className="flex items-center"><div className="w-3 h-3 bg-red-400 rounded-sm mr-2"></div> Incorreto</div>
            <div className="flex items-center"><div className="w-3 h-3 bg-gray-400 rounded-sm mr-2"></div> Ignoradas/Não respondidas</div>
         </div>
      </div>

      {/* Domain Breakdown */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-gray-900">Domínios</h3>
        {Object.entries(domainStats).map(([domain, stats]) => {
            const correctPct = (stats.correct / stats.total) * 100;
            const incorrectPct = (stats.incorrect / stats.total) * 100;
            const ignoredPct = (stats.ignored / stats.total) * 100;
            
            return (
                <div key={domain} className="bg-white">
                   <div className="flex justify-between items-end mb-2">
                      <span className="font-bold text-gray-800 text-sm">{domain} ({stats.total} perguntas)</span>
                   </div>
                   <div className="h-6 w-full bg-gray-100 rounded-sm flex overflow-hidden text-[10px] font-bold text-white leading-6 text-center">
                       {correctPct > 0 && (
                         <div style={{ width: `${correctPct}%` }} className="bg-green-100 text-green-700 flex items-center justify-center">
                            {Math.round(correctPct)}%
                         </div>
                       )}
                       {incorrectPct > 0 && (
                         <div style={{ width: `${incorrectPct}%` }} className="bg-red-100 text-red-700 flex items-center justify-center">
                            {Math.round(incorrectPct)}%
                         </div>
                       )}
                       {ignoredPct > 0 && (
                         <div style={{ width: `${ignoredPct}%` }} className="bg-gray-100 text-gray-400 flex items-center justify-center">
                            {/* Hidden if too small or just empty space */}
                         </div>
                       )}
                   </div>
                </div>
            );
        })}
      </div>
      <div className="h-12"></div>
    </div>
  );
};

const ReviewMode = ({ attempt, onBack }) => {
  const [filter, setFilter] = useState('all');
  const [expandedIds, setExpandedIds] = useState({});

  const toggleExpand = (idx) => {
    setExpandedIds(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getStatus = (idx) => attempt.answers[idx]?.status || 'ignored';
  
  const filteredQuestions = attempt.questions.map((q, i) => ({...q, idx: i})).filter(q => {
     const s = getStatus(q.idx);
     if (filter === 'all') return true;
     if (filter === 'correct') return s === 'correct';
     if (filter === 'incorrect') return s === 'incorrect';
     if (filter === 'ignored') return s === 'ignored';
     return true;
  });

  const stats = {
      correct: Object.values(attempt.answers).filter(a => a.status === 'correct').length,
      incorrect: Object.values(attempt.answers).filter(a => a.status === 'incorrect').length,
      ignored: attempt.total - Object.keys(attempt.answers).length
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
       {/* Header */}
       <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
             <button onClick={onBack} className="text-purple-600 hover:text-purple-800 flex items-center text-sm font-bold">
                <ChevronLeft size={20}/> Voltar para a visão geral do resultado
             </button>
             <h2 className="text-xl font-bold text-gray-900 hidden md:block">Tentativa {attempt.id}</h2>
          </div>
          
          <div className="flex gap-2">
             <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">{attempt.total} todos</span>
             <span className="border border-green-600 text-green-700 px-3 py-1 rounded-full text-xs font-bold bg-green-50">{stats.correct} correto</span>
             <span className="border border-red-600 text-red-700 px-3 py-1 rounded-full text-xs font-bold bg-red-50">{stats.incorrect} incorreto</span>
             <span className="border border-gray-300 text-gray-500 px-3 py-1 rounded-full text-xs font-bold bg-gray-50">{stats.ignored} ignorado</span>
          </div>
       </div>

       {/* Content */}
       <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full">
          <div className="flex justify-end mb-4">
             <button 
               onClick={() => {
                   // Toggle all
                   const allExpanded = filteredQuestions.every(q => expandedIds[q.idx]);
                   const newExpanded = {};
                   if (!allExpanded) {
                       filteredQuestions.forEach(q => newExpanded[q.idx] = true);
                   }
                   setExpandedIds(newExpanded);
               }} 
               className="text-purple-600 text-sm font-bold hover:underline"
             >
                {filteredQuestions.every(q => expandedIds[q.idx]) ? 'Recolher todas as perguntas' : 'Expandir todas as perguntas'}
             </button>
          </div>

          <div className="space-y-4">
             {filteredQuestions.map((q) => {
                 const status = getStatus(q.idx);
                 const isExpanded = expandedIds[q.idx];
                 let icon = <MinusCircle size={20} className="text-gray-400"/>;
                 let statusText = "Ignorado";
                 let statusColor = "text-gray-500";
                 let borderClass = "border-gray-200";

                 if (status === 'correct') {
                     icon = <CheckCircle size={20} className="text-green-600 fill-green-50"/>;
                     statusText = "Correto";
                     statusColor = "text-green-700";
                     borderClass = "border-green-200";
                 } else if (status === 'incorrect') {
                     icon = <XCircle size={20} className="text-red-600 fill-red-50"/>;
                     statusText = "Incorreto";
                     statusColor = "text-red-700";
                     borderClass = "border-red-200";
                 }

                 return (
                     <div key={q.idx} className={`bg-white border rounded-lg shadow-sm overflow-hidden ${borderClass}`}>
                        <div 
                           onClick={() => toggleExpand(q.idx)}
                           className="p-4 flex items-start gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                            <div className="mt-0.5">{icon}</div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-gray-900">{q.header}</span>
                                    <span className={`font-bold text-sm ${statusColor}`}>{statusText}</span>
                                </div>
                                <div className={`text-gray-600 text-sm line-clamp-2 ${isExpanded ? 'hidden' : 'block'}`}>
                                    {q.text}
                                </div>
                            </div>
                            <div className="text-gray-400">
                                {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                            </div>
                        </div>
                        
                        {isExpanded && (
                            <div className="px-4 pb-6 pl-12">
                                <p className="text-gray-800 text-base mb-6 font-medium leading-relaxed">{q.text}</p>
                                
                                <div className="space-y-3">
                                    {q.options.map(opt => {
                                        const userAnswer = attempt.answers[q.idx];
                                        const isSelected = userAnswer?.selectedOptionId === opt.id;
                                        const isCorrect = opt.isCorrect;
                                        
                                        let optClass = "p-3 rounded border flex items-start ";
                                        if (isCorrect) optClass += "bg-green-50 border-green-200";
                                        else if (isSelected && !isCorrect) optClass += "bg-red-50 border-red-200";
                                        else optClass += "bg-white border-gray-200 opacity-70";

                                        return (
                                            <div key={opt.id} className={optClass}>
                                                <div className="mr-3 mt-1">
                                                    {isCorrect ? <Check size={16} className="text-green-700"/> : 
                                                     (isSelected ? <XCircle size={16} className="text-red-600"/> : <div className="w-4 h-4 rounded-full border border-gray-300"></div>)}
                                                </div>
                                                <div className="flex-1">
                                                    <div className={`text-sm ${isCorrect ? 'font-bold text-green-900' : 'text-gray-700'}`}>{opt.text}</div>
                                                    {/* Explanation (Optional to show in review list, typically yes) */}
                                                    {(isCorrect || (isSelected && !isCorrect)) && opt.explanation && (
                                                        <div className="mt-2 text-xs text-gray-500 pt-2 border-t border-black/5 leading-relaxed">
                                                            <span className="font-bold block mb-1">Explicação:</span>
                                                            {opt.explanation}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                     </div>
                 )
             })}
          </div>
          <div className="h-12"></div>
       </div>
    </div>
  );
};

// --- Main App ---

const ProgressBar = ({ current, total }) => {
  const percentage = Math.round(((current) / total) * 100);
  return (
    <div className="flex items-center space-x-4 w-full max-w-xl">
      <span className="text-gray-600 font-medium text-sm">{current}/{total}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-purple-600 transition-all duration-300" style={{ width: `${percentage}%` }}/>
      </div>
    </div>
  );
};

const Sidebar = ({ questions, currentQuestionIndex, onSelectQuestion, isOpen, toggleSidebar, questionStatus }) => {
  const [filter, setFilter] = useState('all'); 
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getStatus = (idx) => questionStatus[idx] || { status: 'unanswered' };

  const filteredQuestions = questions.map((q, i) => ({...q, originalIndex: i})).filter(q => {
     const status = getStatus(q.originalIndex).status;
     if (filter === 'all') return true;
     if (filter === 'correct') return status === 'correct';
     if (filter === 'incorrect') return status === 'incorrect';
     if (filter === 'ignored') return status === 'ignored';
     if (filter === 'unanswered') return status === 'unanswered';
     return true;
  });

  const getStatusIcon = (status) => {
      switch(status) {
          case 'correct': return <CheckCircle size={14} className="text-green-600 fill-green-50" />;
          case 'incorrect': return <XCircle size={14} className="text-red-600 fill-red-50" />;
          case 'ignored': return <MinusCircle size={14} className="text-gray-400" />;
          default: return <div className="w-3.5 h-3.5 border border-gray-300 rounded-sm"></div>;
      }
  };
  
  const getStatusText = (status) => {
    switch(status) {
        case 'correct': return <span className="text-green-700 font-bold ml-2 text-xs">Correto</span>;
        case 'incorrect': return <span className="text-red-600 font-bold ml-2 text-xs">Incorreto</span>;
        case 'ignored': return <span className="text-gray-500 font-medium ml-2 text-xs">Ignorado</span>;
        default: return null;
    }
  };

  const getFilterLabel = () => {
     const map = { all: 'Todas as perguntas', correct: 'Correto', incorrect: 'Incorreto', ignored: 'Ignorado', unanswered: 'Sem resposta' };
     return map[filter] || 'Todas as perguntas';
  };

  if (!isOpen) {
     return (
        <button onClick={toggleSidebar} className="fixed left-4 top-20 bg-white p-2 rounded-full shadow-lg border z-20 md:hidden">
            <Menu size={20} />
        </button>
     );
  }

  return (
    <div className={`fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out w-80 bg-white border-r flex flex-col h-[calc(100vh-64px)] z-20 shadow-xl md:shadow-none`}>
      <div className="p-4 border-b bg-gray-50 relative" ref={dropdownRef}>
        <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex justify-between items-center w-full bg-white border px-3 py-2 rounded-md hover:border-gray-400 transition-colors">
            <span className="font-bold text-gray-700 text-sm">{getFilterLabel()}</span>
            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        {isDropdownOpen && (
            <div className="absolute left-4 right-4 top-14 bg-white border rounded-lg shadow-lg z-30 py-1">
                {['all', 'correct', 'incorrect', 'ignored', 'unanswered'].map(f => (
                    <button key={f} onClick={() => { setFilter(f); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 capitalize">
                        {f === 'all' ? 'Todas as perguntas' : f}
                    </button>
                ))}
            </div>
        )}
        <div className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer mt-3">
           <span>Todos os domínios</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredQuestions.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Nenhuma pergunta encontrada neste filtro.</div>
        ) : (
            filteredQuestions.map((q) => {
            const statusObj = getStatus(q.originalIndex);
            return (
            <div key={q.originalIndex} onClick={() => onSelectQuestion(q.originalIndex)} className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors relative ${currentQuestionIndex === q.originalIndex ? 'bg-purple-50' : ''}`}>
                {currentQuestionIndex === q.originalIndex && <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-600"></div>}
                <div className="flex items-center mb-1">
                    <span className="mr-2">{getStatusIcon(statusObj.status)}</span>
                    <span className="font-bold text-sm text-gray-900">{q.header}</span>
                    {getStatusText(statusObj.status)}
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 ml-6">{q.text}</p>
            </div>
            )})
        )}
      </div>
      <button onClick={toggleSidebar} className="md:hidden absolute top-2 right-2 p-1 text-gray-500"><ChevronLeft /></button>
    </div>
  );
};

const QuestionOption = ({ option, isSelected, isSubmitted, onSelect }) => {
  if (!isSubmitted) {
    const containerClass = `border p-4 rounded-lg flex items-start cursor-pointer transition-all relative group mb-3
      ${isSelected ? 'border-black ring-1 ring-black bg-gray-50' : 'border-gray-300 hover:border-black'}`;
    return (
      <div onClick={() => onSelect(option.id)} className={containerClass}>
        <div className={`w-5 h-5 rounded-full border ${isSelected ? 'border-[6px] border-black' : 'border-gray-400 group-hover:border-black'} mr-3 flex-shrink-0 transition-all`}></div>
        <span className="text-gray-800 text-sm md:text-base leading-relaxed">{option.text}</span>
      </div>
    );
  }

  const isCorrectOption = option.isCorrect;
  const isWrongSelection = isSelected && !isCorrectOption;
  
  let containerClass = "rounded-lg overflow-hidden border mb-4 ";
  let header = null;
  let icon = <div className="w-5 h-5 rounded-full border border-gray-400 mr-3 flex-shrink-0 opacity-50"></div>;

  if (isCorrectOption) {
     containerClass += "border-green-200 bg-white";
     icon = <CheckCircle className="w-5 h-5 text-green-700 mr-3 flex-shrink-0" />;
     const headerText = isSelected ? "Sua resposta está correta" : "Resposta correta";
     header = <div className="bg-green-100 px-4 py-2 flex items-center border-b border-green-200"><span className="font-bold text-green-800 text-sm">{headerText}</span></div>;
  } else if (isWrongSelection) {
     containerClass += "border-red-200 bg-white";
     icon = <XCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />;
     header = <div className="bg-red-100 px-4 py-2 flex items-center border-b border-red-200"><span className="font-bold text-red-800 text-sm">Sua resposta está incorreta</span></div>;
  } else {
     containerClass += "border-gray-200 bg-gray-50 opacity-80";
     icon = <div className="w-5 h-5 rounded-full border border-gray-300 mr-3 flex-shrink-0"></div>;
  }

  return (
    <div className={containerClass}>
      {header}
      <div className="p-4">
        <div className="flex items-start">
           {icon}
           <span className={`text-sm md:text-base leading-relaxed ${isCorrectOption ? 'font-medium text-gray-900' : 'text-gray-700'}`}>{option.text}</span>
        </div>
        {option.explanation && (
          <div className="mt-4 pt-4 border-t border-gray-100 pl-8">
             <h4 className="font-bold text-gray-900 mb-1 text-sm">Explicação</h4>
             <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{option.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const App = () => {
  const [mode, setMode] = useState('input'); // input, quiz, results, review
  const [rawText, setRawText] = useState(DEMO_TEXT.trim());
  const [questions, setQuestions] = useState([]);
  const [attemptHistory, setAttemptHistory] = useState([]);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Quiz State
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [draftAnswers, setDraftAnswers] = useState({}); 
  const [questionStatus, setQuestionStatus] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const startTimeRef = useRef(null);
  const mainContentRef = useRef(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('simuladoState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setMode(parsed.mode || 'input');
        setQuestions(parsed.questions || []);
        setCurrentQIndex(parsed.currentQIndex || 0);
        setDraftAnswers(parsed.draftAnswers || {});
        setQuestionStatus(parsed.questionStatus || {});
        setRawText(parsed.rawText || DEMO_TEXT.trim());
        if (parsed.startTime) startTimeRef.current = parsed.startTime;
      } catch (e) {
        console.error('Error loading state:', e);
      }
    }

    const savedHistory = localStorage.getItem('simuladoHistory');
    if (savedHistory) {
      try {
        setAttemptHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Error loading history:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save current state to localStorage (only after initial load)
  useEffect(() => {
    if (!isLoaded) return;
    
    const state = {
      mode,
      questions,
      currentQIndex,
      draftAnswers,
      questionStatus,
      rawText,
      startTime: startTimeRef.current
    };
    localStorage.setItem('simuladoState', JSON.stringify(state));
  }, [mode, questions, currentQIndex, draftAnswers, questionStatus, rawText, isLoaded]);

  // Save history to localStorage (only after initial load)
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('simuladoHistory', JSON.stringify(attemptHistory));
  }, [attemptHistory, isLoaded]);

  // Show loading while restoring state
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  const handleLoadQuiz = () => {
    const parsed = parseQuizText(rawText);
    if (parsed && parsed.length > 0) {
      setQuestions(parsed);
      startNewQuiz(parsed);
    } else {
      alert("Não foi possível identificar perguntas no texto.");
    }
  };

  const startNewQuiz = (qs) => {
      setMode('quiz');
      setCurrentQIndex(0);
      setDraftAnswers({});
      setQuestionStatus({});
      startTimeRef.current = Date.now();
  };

  const resetQuiz = () => {
    localStorage.removeItem('simuladoState');
    setMode('input');
    setQuestions([]);
    setCurrentQIndex(0);
    setDraftAnswers({});
    setQuestionStatus({});
    startTimeRef.current = null;
  };

  const finishQuiz = () => {
      // Calculate results
      const endTime = Date.now();
      const duration = endTime - (startTimeRef.current || endTime);
      
      const finalAnswers = { ...questionStatus };
      
      // Auto-mark unanswered as ignored
      questions.forEach((q, idx) => {
          if (!finalAnswers[idx]) {
              finalAnswers[idx] = {
                  selectedOptionId: null,
                  status: 'ignored',
                  isCorrect: false
              };
          }
      });
      
      const correctCount = Object.values(finalAnswers).filter(a => a.status === 'correct').length;
      
      const attempt = {
          id: attemptHistory.length + 1,
          date: new Date(),
          duration: duration,
          score: correctCount,
          total: questions.length,
          questions: questions, // Snapshot of questions (in case user reloads different text later)
          answers: finalAnswers
      };

      const newHistory = [...attemptHistory, attempt];
      setAttemptHistory(newHistory);
      setMode('results');
  };

  const handleSelectOption = (optionId) => {
    if (!questionStatus[currentQIndex]) {
        setDraftAnswers(prev => ({ ...prev, [currentQIndex]: optionId }));
    }
  };

  const checkAnswer = () => {
      const selectedId = draftAnswers[currentQIndex];
      const question = questions[currentQIndex];
      const selectedOption = question.options.find(o => o.id === selectedId);
      const isCorrect = selectedOption?.isCorrect || false;
      setQuestionStatus(prev => ({
          ...prev, [currentQIndex]: { selectedOptionId: selectedId, status: isCorrect ? 'correct' : 'incorrect', isCorrect }
      }));
  };
  
  const handleNext = () => {
      if (!questionStatus[currentQIndex]) {
          setQuestionStatus(prev => ({
              ...prev, [currentQIndex]: { selectedOptionId: null, status: 'ignored', isCorrect: false }
          }));
      }
      if (currentQIndex < questions.length - 1) {
          setCurrentQIndex(currentQIndex + 1);
      } else {
          // Finish button action
          finishQuiz();
      }
  };

  useEffect(() => { if (mainContentRef.current) mainContentRef.current.scrollTop = 0; }, [currentQIndex]);

  // --- Render Views ---

  if (mode === 'results') {
      return (
          <ResultsDashboard 
            history={attemptHistory} 
            onReviewAttempt={(attempt) => {
                setSelectedAttempt(attempt);
                setMode('review');
            }}
            onBackToInput={resetQuiz}
          />
      );
  }

  if (mode === 'review') {
      return (
          <ReviewMode 
             attempt={selectedAttempt} 
             onBack={() => setMode('results')} 
          />
      );
  }

  if (mode === 'input') {
    const hasSavedQuiz = questions.length > 0;
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-2xl w-full p-8 rounded-xl shadow-lg">
          <div className="text-center mb-8">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="text-purple-600" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Carregar Simulado</h1>
            <p className="text-gray-500 mt-2">Cole o texto do seu arquivo abaixo.</p>
          </div>
          
          {hasSavedQuiz && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-purple-900">Simulado em andamento</span>
                <span className="text-sm text-purple-700">{questions.length} perguntas</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setMode('quiz')}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
                >
                  Continuar
                </button>
                <button 
                  onClick={resetQuiz}
                  className="px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-100 transition-all"
                >
                  Novo
                </button>
              </div>
            </div>
          )}
          
          <textarea 
            className="w-full h-64 p-4 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none mb-6 text-gray-700"
            placeholder="Cole o texto aqui..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <button 
            onClick={handleLoadQuiz}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Play size={20} />
            {hasSavedQuiz ? 'Substituir Simulado' : 'Gerar Simulado'}
          </button>
          
          {attemptHistory.length > 0 && (
             <button 
               onClick={() => setMode('results')}
               className="mt-4 w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-lg transition-all"
             >
                Ver Histórico ({attemptHistory.length})
             </button>
          )}
        </div>
      </div>
    );
  }

  // Quiz Mode
  const currentQuestion = questions[currentQIndex];
  const submission = questionStatus[currentQIndex];
  const isSubmitted = !!submission;
  const selectedOptionId = isSubmitted ? submission.selectedOptionId : draftAnswers[currentQIndex];
  const hasDraftSelection = draftAnswers[currentQIndex] !== undefined && draftAnswers[currentQIndex] !== null;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900">
      <header className="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">Practice mode (Beta)</div>
          <AlertCircle size={16} className="text-gray-400" />
        </div>
        <ProgressBar current={currentQIndex + 1} total={questions.length} />
        <div className="flex items-center space-x-4">
          <button onClick={finishQuiz} className="border border-purple-600 text-purple-600 px-4 py-1.5 rounded font-bold text-sm hover:bg-purple-50 transition-colors">Finalizar teste</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          questions={questions} 
          currentQuestionIndex={currentQIndex}
          onSelectQuestion={setCurrentQIndex}
          isOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          questionStatus={questionStatus}
        />

        <main ref={mainContentRef} className="flex-1 overflow-y-auto p-4 md:p-12 relative">
           <div className="flex items-center text-gray-500 text-sm mb-6">
              <span className="mr-2"><FileText size={16}/></span>
              <span>{currentQuestion.header}:</span>
           </div>
           <h2 className="text-lg md:text-xl font-bold text-gray-900 leading-relaxed mb-8">{currentQuestion.text}</h2>
           <div className="space-y-4 max-w-3xl">
              {currentQuestion.options.map((opt) => (
                <QuestionOption 
                  key={opt.id}
                  option={opt}
                  isSelected={selectedOptionId === opt.id}
                  isSubmitted={isSubmitted}
                  onSelect={handleSelectOption}
                />
              ))}
           </div>
           <div className="max-w-3xl mt-12 flex justify-between items-center border-t pt-6">
              <button onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))} disabled={currentQIndex === 0} className={`flex items-center px-4 py-2 rounded font-bold text-sm ${currentQIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-900 hover:bg-gray-100'}`}>
                <ChevronLeft size={16} className="mr-1" /> Anterior
              </button>
              <div className="flex gap-3">
                  {!isSubmitted && hasDraftSelection ? (
                       <button onClick={checkAnswer} className="flex items-center bg-purple-600 text-white px-6 py-2.5 rounded font-bold text-sm hover:bg-purple-700 transition-colors shadow-sm">Conferir resposta</button>
                  ) : (
                       <button onClick={handleNext} className="flex items-center bg-gray-900 text-white px-6 py-2.5 rounded font-bold text-sm hover:bg-gray-800 transition-colors shadow-sm">
                          {currentQIndex === questions.length - 1 ? 'Finalizar' : 'Próxima'} <ChevronRight size={16} className="ml-1" />
                       </button>
                  )}
              </div>
           </div>
           <div className="h-12"></div>
        </main>
      </div>
    </div>
  );
};

export default App;