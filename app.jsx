import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Settings, 
  FileText, 
  Play,
  Upload
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

// --- Parser Logic ---

const parseQuizText = (text) => {
  if (!text) return [];

  // Normalize line endings
  const normalizedText = text.replace(/\r\n/g, '\n');
  
  // Split by "Pergunta X"
  // Lookahead regex to keep the delimiter
  const rawChunks = normalizedText.split(/(?=Pergunta \d+)/);
  
  const questions = rawChunks
    .filter(chunk => chunk.trim().length > 0)
    .map((chunk, index) => {
      try {
        const lines = chunk.trim().split('\n').map(l => l.trim()).filter(l => l);
        
        // 1. Extract Header (Pergunta X)
        const header = lines[0];
        
        // 2. Identify Domain (usually at the end)
        let domain = "";
        const domainIndex = lines.findIndex(l => l.toLowerCase().startsWith('domínio'));
        let contentLines = lines;
        
        if (domainIndex !== -1) {
          domain = lines.slice(domainIndex + 1).join(' ');
          contentLines = lines.slice(0, domainIndex);
        }

        // 3. Remove "Correto"/"Incorreto" lines that appear immediately after header
        // These are artifacts of the user's previous attempt in the source text
        let startIndex = 1;
        while(startIndex < contentLines.length && 
             (contentLines[startIndex].toLowerCase() === 'correto' || 
              contentLines[startIndex].toLowerCase() === 'incorreto')) {
          startIndex++;
        }
        
        // 4. Extract Question Text and Options
        // Strategy: Use "Explicação" as an anchor.
        // Everything before an "Explicação" is the Option (and potentially the Question if it's the first one).
        
        const fullContent = contentLines.slice(startIndex).join('\n');
        
        // Split by "Explicação"
        // This gives us parts like:
        // Part 0: [Question Text] ... [Option 1]
        // Part 1: [Explanation 1] ... [Option 2]
        // Part 2: [Explanation 2] ... [Option 3]
        
        const parts = fullContent.split(/Explicação/i);
        
        if (parts.length < 2) return null; // Invalid format

        const options = [];
        let questionText = "";

        // Process Part 0 (Question + First Option)
        // We need to separate Question from Option 1. 
        // Heuristic: The Option 1 is likely the last paragraph/sentence of this block.
        // However, we also need to handle "Sua resposta está correta".
        
        const processPartForOption = (textSegment, isFirstPart = false, previousExplanation = "") => {
           let cleanSegment = textSegment.trim();
           let isCorrect = false;

           // Check for correctness marker
           if (cleanSegment.includes('Sua resposta está correta') || cleanSegment.includes('Sua resposta está incorreta')) {
             if (cleanSegment.includes('Sua resposta está correta')) isCorrect = true;
             // Remove the marker
             cleanSegment = cleanSegment.replace(/Sua resposta está correta/gi, '')
                                        .replace(/Sua resposta está incorreta/gi, '')
                                        .trim();
           }

           if (isFirstPart) {
             // Split into paragraphs. Last paragraph is likely the option.
             // This is risky but standard for this format where there is no "A)" or bullet.
             const paragraphs = cleanSegment.split('\n');
             if (paragraphs.length > 1) {
                const optText = paragraphs.pop(); // Last one is option
                questionText = paragraphs.join('\n'); // Rest is question
                return { text: optText, isCorrect };
             } else {
               // Fallback if it's all one line? unlikely
               return { text: cleanSegment, isCorrect }; 
             }
           } else {
             // For subsequent parts, the textSegment contains:
             // [Rest of Previous Explanation] (Wait, we split by "Explicação")
             // actually, the split removed "Explicação". 
             // So Part 1 starts with the Explanation text for Option 1.
             // AND ends with the Text for Option 2.
             
             // We need to find where the Explanation ends and Option 2 starts.
             // Explanation usually ends with "Reference: ..." or a period.
             // Let's assume the Option starts on a new line after the reference.
             
             // We are processing the segment that contains: [Explanation for Prev Option] \n [Next Option Text]
             // We return BOTH the explanation for the previous option AND the text for the new option.
             
             const lines = cleanSegment.split('\n');
             
             // Find the split point. Usually explanations are long, options short.
             // Or, look for Reference.
             let splitIdx = lines.length - 1;
             
             // If we have "Sua resposta está correta" in the lines, that line is definitely part of the OPTION, not explanation.
             
             const explanationLines = [];
             const optionLines = [];
             
             let foundOptionStart = false;
             
             // Scanning from bottom up might be safer to find the Option
             // The Option is usually the last non-empty chunk.
             
             // Let's refine: The explanation usually has a "Reference:"
             const refIndex = lines.findIndex(l => l.includes('Reference:'));
             if (refIndex !== -1) {
                // Everything up to refIndex is explanation.
                // RefIndex line is explanation.
                // Everything after is Option.
                const expl = lines.slice(0, refIndex + 1).join('\n');
                const opt = lines.slice(refIndex + 1).join('\n');
                
                // Check if "Sua resposta..." is in the option part
                if (opt.toLowerCase().includes('sua resposta está correta')) {
                    isCorrect = true;
                }
                const finalOpt = opt.replace(/Sua resposta está correta/gi, '').replace(/Sua resposta está incorreta/gi, '').trim();
                
                return { explanation: expl, nextOptionText: finalOpt, isCorrectNext: isCorrect };
             } else {
                // Fallback: Last line is option?
                const nextOpt = lines.pop();
                const expl = lines.join('\n');
                 if (nextOpt && nextOpt.toLowerCase().includes('sua resposta está correta')) {
                    isCorrect = true;
                }
                const finalOpt = nextOpt ? nextOpt.replace(/Sua resposta está correta/gi, '').replace(/Sua resposta está incorreta/gi, '').trim() : '';
                return { explanation: expl, nextOptionText: finalOpt, isCorrectNext: isCorrect };
             }
           }
        };

        // 1. Process first block to get Question and Option 1
        const firstBlock = processPartForOption(parts[0], true);
        options.push({ 
            id: 0, 
            text: firstBlock.text, 
            isCorrect: firstBlock.isCorrect,
            explanation: '' // Will be filled by next part
        });

        // 2. Process middle blocks
        for (let i = 1; i < parts.length; i++) {
           const result = processPartForOption(parts[i]);
           
           // The result contains the explanation for the PREVIOUS option (i-1)
           // and the text for the CURRENT option (i) (unless it's the last part)
           
           if (options[i-1]) {
               options[i-1].explanation = result.explanation;
           }
           
           // If there is a next option text (meaning this wasn't just the last explanation)
           if (result.nextOptionText || i < parts.length - 1) { // logic check
               // Wait, the last part ONLY has explanation for the last option. It has no "next option".
               if (i < parts.length) {
                   // Only add a new option if this isn't the purely final explanation block
                   // Actually, split by Explicação means:
                   // [Q+O1] , [E1+O2], [E2+O3], [E3]
                   // So parts.length is 4. Options should be 3.
                   
                   if (result.nextOptionText) {
                        options.push({
                            id: i,
                            text: result.nextOptionText,
                            isCorrect: result.isCorrectNext,
                            explanation: ''
                        });
                   }
               }
           } else {
               // This was the last chunk, it purely contained the explanation for the last option
           }
        }

        return {
          id: index + 1,
          header: header,
          text: questionText,
          options: options,
          domain: domain
        };

      } catch (e) {
        console.error("Error parsing chunk", e);
        return null;
      }
    })
    .filter(q => q !== null);
    
  return questions;
};


// --- Components ---

const ProgressBar = ({ current, total }) => {
  const percentage = Math.round(((current) / total) * 100);
  return (
    <div className="flex items-center space-x-4 w-full max-w-xl">
      <span className="text-gray-600 font-medium text-sm">{current}/{total}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-purple-600 transition-all duration-300" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const Header = ({ current, total, onFinish }) => (
  <header className="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
    <div className="flex items-center space-x-3">
      <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">
        Practice mode (Beta)
      </div>
      <AlertCircle size={16} className="text-gray-400" />
    </div>

    <ProgressBar current={current} total={total} />

    <div className="flex items-center space-x-4">
      <button className="text-purple-600 text-sm font-medium hover:underline">
        Compartilhar feedback
      </button>
      <button 
        onClick={onFinish}
        className="border border-purple-600 text-purple-600 px-4 py-1.5 rounded font-bold text-sm hover:bg-purple-50 transition-colors"
      >
        Finalizar teste
      </button>
    </div>
  </header>
);

const Sidebar = ({ questions, currentQuestionIndex, onSelectQuestion, isOpen, toggleSidebar }) => {
  if (!isOpen) {
     return (
        <button 
            onClick={toggleSidebar}
            className="fixed left-4 top-20 bg-white p-2 rounded-full shadow-lg border z-20 md:hidden"
        >
            <Menu size={20} />
        </button>
     );
  }

  return (
    <div className={`
      fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      md:relative md:translate-x-0 transition duration-200 ease-in-out
      w-80 bg-white border-r flex flex-col h-[calc(100vh-64px)] z-20
    `}>
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <h2 className="font-bold text-gray-700">Todas as perguntas</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
           <span>Todos os domínios</span>
           <ChevronLeft className="rotate-[-90deg]" size={14}/>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {questions.map((q, idx) => (
          <div 
            key={idx}
            onClick={() => onSelectQuestion(idx)}
            className={`
              p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors relative
              ${currentQuestionIndex === idx ? 'bg-gray-100' : ''}
            `}
          >
             {/* Active Indicator Strip */}
             {currentQuestionIndex === idx && (
                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-black"></div>
             )}

            <div className="flex justify-between items-start mb-1">
               <span className="font-bold text-sm text-gray-900">{q.header}</span>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2">
              {q.text}
            </p>
          </div>
        ))}
      </div>
      
      {/* Mobile Close Button */}
      <button 
        onClick={toggleSidebar}
        className="md:hidden absolute top-2 right-2 p-1 text-gray-500"
      >
        <ChevronLeft />
      </button>
    </div>
  );
};

const QuestionOption = ({ option, isSelected, isAnswered, onSelect }) => {
  // Logic mimicking Udemy:
  // Before answer: Standard radio hover.
  // After answer:
  // - If this option was selected AND Correct: Green border, check icon.
  // - If this option was selected AND Incorrect: Red border.
  // - If this option is Correct (regardless of selection): Show bold?
  // Actually, based on screenshot 3:
  // Incorrect selection -> Red Box. The correct answer is NOT explicitly highlighted green in the options list itself in the screenshot,
  // BUT the explanation box below shows the correct answer text.
  // However, usually helpful UIs highlight the correct one too. I'll stick to the screenshot visuals.
  // Screenshot 2 (Correct): Green border around the radio box.
  
  let containerClass = "border p-4 rounded-lg flex items-start cursor-pointer transition-all relative group ";
  let icon = <div className="w-5 h-5 rounded-full border border-gray-400 mr-3 flex-shrink-0 group-hover:border-black"></div>;
  
  if (!isAnswered) {
    containerClass += isSelected ? "border-black ring-1 ring-black bg-gray-50" : "border-gray-300 hover:border-black";
    if (isSelected) icon = <div className="w-5 h-5 rounded-full border-[6px] border-black mr-3 flex-shrink-0"></div>;
  } else {
    // Answered State
    if (isSelected) {
       if (option.isCorrect) {
         // Correct Selection
         containerClass += "border-green-700 bg-white ring-1 ring-green-700";
         icon = <CheckCircle className="w-5 h-5 text-green-700 mr-3 flex-shrink-0" />;
       } else {
         // Incorrect Selection
         containerClass += "border-red-600 bg-white ring-1 ring-red-600";
         icon = <div className="w-5 h-5 rounded-full border-[6px] border-red-600 mr-3 flex-shrink-0"></div>;
       }
    } else {
        // Not selected
        containerClass += "border-gray-200 opacity-60";
    }
  }

  return (
    <div onClick={() => !isAnswered && onSelect(option.id)} className={containerClass}>
      {icon}
      <span className={`text-sm md:text-base leading-relaxed ${isAnswered && isSelected && option.isCorrect ? 'font-medium text-gray-900' : 'text-gray-800'}`}>
        {option.text}
      </span>
    </div>
  );
};

const FeedbackBox = ({ isCorrect, correctOption, explanation }) => {
  if (isCorrect) {
    return (
      <div className="mt-6 border border-green-200 rounded-lg overflow-hidden animate-fade-in">
        <div className="bg-green-100 px-4 py-3 flex items-center">
          <span className="font-bold text-green-800 text-sm">Sua resposta está correta</span>
        </div>
        <div className="p-4 bg-white">
           <h4 className="font-bold text-gray-900 mb-2">Explicação</h4>
           <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{explanation}</p>
        </div>
      </div>
    );
  } else {
    return (
      <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden animate-fade-in">
        {/* Error Header */}
        <div className="bg-red-100 px-4 py-3 flex items-center border-b border-red-200">
           <span className="font-bold text-red-800 text-sm">Sua resposta está incorreta</span>
        </div>
        
        {/* Correct Answer Display (Based on screenshot 3 logic, usually displayed somewhere) */}
        <div className="p-4 bg-white border-b border-gray-100">
            <div className="flex items-start">
               <CheckCircle className="w-5 h-5 text-gray-800 mr-3 flex-shrink-0 mt-0.5" />
               <span className="font-bold text-gray-900 text-sm">{correctOption.text}</span>
            </div>
        </div>

        {/* Explanation */}
        <div className="p-4 bg-white">
           <h4 className="font-bold text-gray-900 mb-2">Explicação</h4>
           <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{explanation}</p>
        </div>
      </div>
    );
  }
};

const App = () => {
  const [mode, setMode] = useState('input'); // 'input' | 'quiz'
  const [rawText, setRawText] = useState(DEMO_TEXT.trim());
  const [questions, setQuestions] = useState([]);
  
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { [questionIndex]: optionId }
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Parsing Effect
  const handleLoadQuiz = () => {
    const parsed = parseQuizText(rawText);
    if (parsed && parsed.length > 0) {
      setQuestions(parsed);
      setMode('quiz');
      setCurrentQIndex(0);
      setUserAnswers({});
    } else {
      alert("Não foi possível identificar perguntas no texto. Verifique o formato.");
    }
  };

  const handleSelectOption = (optionId) => {
    setUserAnswers(prev => ({
      ...prev,
      [currentQIndex]: optionId
    }));
  };

  // Scroll to top when question changes
  const mainContentRef = useRef(null);
  useEffect(() => {
    if (mainContentRef.current) {
        mainContentRef.current.scrollTop = 0;
    }
  }, [currentQIndex]);

  if (mode === 'input') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-2xl w-full p-8 rounded-xl shadow-lg">
          <div className="text-center mb-8">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="text-purple-600" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Carregar Simulado</h1>
            <p className="text-gray-500 mt-2">Cole o texto do seu arquivo abaixo para gerar o simulado interativo.</p>
          </div>

          <textarea 
            className="w-full h-64 p-4 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none mb-6 text-gray-700"
            placeholder="Cole o texto aqui (Formato: Pergunta 1 ...)"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />

          <button 
            onClick={handleLoadQuiz}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Play size={20} />
            Gerar Simulado
          </button>
          
          <div className="mt-4 text-xs text-gray-400 text-center">
            O texto deve seguir o padrão: "Pergunta X", opções e explicações.
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQIndex];
  const selectedOptionId = userAnswers[currentQIndex];
  const isAnswered = selectedOptionId !== undefined;
  
  // Find relevant data for feedback
  const selectedOption = currentQuestion.options.find(o => o.id === selectedOptionId);
  const correctOption = currentQuestion.options.find(o => o.isCorrect);
  // If answered, show explanation for the SELECTED option (if incorrect) or CORRECT option (if correct)
  // Actually, usually you want to see the explanation for the correct answer regardless, 
  // or specifically why your answer was wrong.
  // The provided text maps specific explanations to specific options.
  const explanationToShow = isAnswered 
    ? (selectedOption?.explanation || correctOption?.explanation) 
    : null;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900">
      
      <Header 
        current={currentQIndex + 1} 
        total={questions.length} 
        onFinish={() => setMode('input')}
      />

      <div className="flex flex-1 overflow-hidden">
        
        <Sidebar 
          questions={questions} 
          currentQuestionIndex={currentQIndex}
          onSelectQuestion={setCurrentQIndex}
          isOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Main Content Area */}
        <main ref={mainContentRef} className="flex-1 overflow-y-auto p-4 md:p-12 relative">
           {/* Header / Meta */}
           <div className="flex items-center text-gray-500 text-sm mb-6">
              <span className="mr-2"><FileText size={16}/></span>
              <span>{currentQuestion.header}:</span>
           </div>

           {/* Question Text */}
           <h2 className="text-lg md:text-xl font-bold text-gray-900 leading-relaxed mb-8">
             {currentQuestion.text}
           </h2>

           {/* Options Grid */}
           <div className="space-y-3 max-w-3xl">
              {currentQuestion.options.map((opt) => (
                <QuestionOption 
                  key={opt.id}
                  option={opt}
                  isSelected={selectedOptionId === opt.id}
                  isAnswered={isAnswered}
                  onSelect={handleSelectOption}
                />
              ))}
           </div>

           {/* Feedback Section (Only appears after answering) */}
           {isAnswered && (
             <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <FeedbackBox 
                   isCorrect={selectedOption?.isCorrect}
                   correctOption={correctOption}
                   explanation={explanationToShow || "Sem explicação disponível."}
                />
             </div>
           )}

           {/* Navigation Footer within Main */}
           <div className="max-w-3xl mt-12 flex justify-between items-center border-t pt-6">
              <button 
                onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))}
                disabled={currentQIndex === 0}
                className={`flex items-center px-4 py-2 rounded font-bold text-sm ${currentQIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-900 hover:bg-gray-100'}`}
              >
                <ChevronLeft size={16} className="mr-1" /> Anterior
              </button>

              <button 
                onClick={() => setCurrentQIndex(Math.min(questions.length - 1, currentQIndex + 1))}
                className="flex items-center bg-gray-900 text-white px-6 py-2.5 rounded font-bold text-sm hover:bg-gray-800 transition-colors"
              >
                 {currentQIndex === questions.length - 1 ? 'Finalizar' : 'Próxima'} <ChevronRight size={16} className="ml-1" />
              </button>
           </div>
           
           <div className="h-12"></div> {/* Bottom spacer */}
        </main>
      </div>
    </div>
  );
};

export default App;