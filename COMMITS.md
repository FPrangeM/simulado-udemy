# Histórico de Commits

## 1. feat: Configurar projeto React com Vite e Tailwind CSS

- Adicionar package.json com dependências (react, react-dom, vite, tailwindcss, postcss, autoprefixer, lucide-react)
- Configurar vite.config.js, tailwind.config.js, postcss.config.js
- Criar index.html e estrutura src/main.jsx, src/index.css

## 2. fix: Corrigir parser de quiz para múltiplos formatos

- Reescrever função parseQuizText para ser mais robusta
- Detectar corretamente onde termina a explicação e começa a próxima alternativa
- Suportar "Reference:" como parte da explicação
- Suportar "Resposta correta" e "Sua resposta está correta" em qualquer posição

## 3. feat: Adicionar revisão de tentativas anteriores

- Tornar itens do histórico de tentativas clicáveis na ResultsDashboard
- Adicionar cursor pointer e efeitos de hover
- Adicionar ícone de seta para indicar ação

## 4. feat: Implementar persistência de dados com localStorage

- Salvar histórico de tentativas no localStorage
- Carregar histórico ao iniciar aplicação

## 5. feat: Persistir estado do quiz em andamento

- Salvar modo (input/quiz/results/review), rawText, questions no localStorage
- Salvar currentQIndex, draftAnswers, questionStatus, startTime
- Restaurar estado completo ao recarregar página

## 6. fix: Corrigir conversão de datas do localStorage

- Converter strings para objetos Date no useState inicial
- Evitar erros "Invalid time value" no ResultsDashboard

## 7. fix: Corrigir redirecionamento em modo review

- Redirecionar para resultados se selectedAttempt for null
- Verificar modo 'review' antes de restaurar do localStorage

## 8. feat: Adicionar toggle da barra lateral

- Novo botão ao lado do filtro "Todas as perguntas"
- Ícone PanelLeftClose para recolher
- Suporte para desktop e mobile

## 9. style: Centralizar conteúdo do quiz

- Adicionar max-w-3xl mx-auto no container principal
- Alinhar pergunta, alternativas e botões na mesma largura

## 10. fix: Corrigir lógica de pular questões

- Não marcar como ignorado ao clicar em "Próxima"
- Manter alternativas desbloqueadas ao voltar para questão não respondida

## 11. style: Aumentar tamanho do texto das alternativas

- Alterar tamanho de fonte de 14px para 16px
- Aplicar em todos os modos (quiz, revisão, resposta submetida)



| # | Commit | Descrição |
|---|--------|-----------|
| 1 | feat | Configurar projeto React com Vite e Tailwind CSS |
| 2 | fix | Corrigir parser de quiz para múltiplos formatos |
| 3 | feat | Adicionar revisão de tentativas anteriores |
| 4 | feat | Implementar persistência de dados com localStorage |
| 5 | feat | Persistir estado do quiz em andamento |
| 6 | fix | Corrigir conversão de datas do localStorage |
| 7 | fix | Corrigir redirecionamento em modo review |
| 8 | feat | Adicionar toggle da barra lateral |
| 9 | style | Centralizar conteúdo do quiz |
| 10 | fix | Corrigir lógica de pular questões |
| 11 | style | Aumentar tamanho do texto das alternativas |