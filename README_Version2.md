# Shift Scheduler — Demo

Uma demo para gerar horários de trabalho (turnos) por linha de produção. Feita para apresentação — corre localmente, por Docker ou no GitHub Codespaces sem instalar nada no teu PC.

Resumo rápido
- Backend: FastAPI + SQLModel (SQLite)
- Frontend: React (simples, single-page)
- Import/Export: CSV e XLSX
- Sistemas de escala suportados (demo):
  - 5x2 rotativa (5 dias trabalho / 2 folgas rotativas)
  - 4x2 rotativa (4 dias trabalho / 2 folgas rotativas)
  - 5x2 com folgas fixas (ex.: Sábado/Domingo)
- Turnos:
  - Manhã: 08:00–16:00
  - Tarde: 16:00–00:00
  - Noite: 00:00–08:00

Objetivo desta demo
- Mostrar um MVP funcional onde se:
  1. Faz upload do plano de produção (CSV).
  2. Faz upload das fichas de operadores (CSV).
  3. Gera automaticamente o horário (heurística demonstrativa).
  4. Exporta o horário em CSV ou XLSX.
- Ideal para apresentação: fácil de explicar, self-contained e pronto para rodar em Codespaces.

Conteúdo do repositório (expectável)
- backend/ — API FastAPI (endpoints para upload, geração e export).
- frontend/ — React app minimal para upload/controle e preview.
- templates/ — CSV de exemplo: production_plan_template.csv e operators_template.csv
- docker-compose.yml — levantar backend + frontend em containers.
- .devcontainer/ — configuração para GitHub Codespaces (opcional).
- start-demo.sh — script para iniciar backend + frontend no ambiente.

Executar sem instalar nada (recomendado: GitHub Codespaces)
1. Cria o repositório no teu GitHub (por ex. fabiofmelosantos-cloud/shift-scheduler-demo) e puxa todos os ficheiros.
2. No GitHub: Code → Codespaces → Create codespace on main.
3. Quando o Codespace estiver pronto, abre um terminal e executa:
   ```bash
   ./start-demo.sh
   ```
4. O Codespaces expõe as portas automaticamente:
   - Backend (API docs): https://<codespace>-8000.preview.app.github.dev/docs
   - Frontend: https://<codespace>-3000.preview.app.github.dev/

Executar com Docker (local)
1. Docker & Docker Compose instalados.
2. No root do repo:
   ```bash
   docker compose up --build
   ```
3. Backend: http://localhost:8000 — Frontend: http://localhost:3000

Executar local (sem Docker)
Backend:
```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Frontend:
```bash
cd frontend
npm install
npm start
```

Endpoints principais (demo)
- POST /upload/production-plan — upload CSV do plano de produção
- POST /upload/operators — upload CSV de operadores
- GET /operators — listar operadores
- POST /schedules/generate?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&system_type=5x2_rotativa
- GET /schedules/export — descarrega CSV
- GET /schedules/export_xlsx — descarrega XLSX

Templates CSV (localizados em templates/)
- production_plan_template.csv
  - colunas: date,line,produto,turno,unidades_necessarias,poste1,poste2,...
  - exemplo de poste: "1:Operador Maq;1:Líder;1:Embala"
- operators_template.csv
  - colunas: operator_id,name,email,phone,emergency_contact,specialties,fixed_days_off,restrictions
  - fixed_days_off usa nomes em inglês na demo: Saturday;Sunday (posso adaptar para PT se preferires)

Notas técnicas e limitações (demo)
- O gerador usa uma heurística determinística e simples:
  - Respeita folgas fixas e um padrão rotativo demonstrativo.
  - Evita alocar o mesmo operador em dois turnos no mesmo dia.
  - Prioriza operadores com a especialidade requerida; caso não haja, usa fallback.
- Para regras legais complexas (descanso mínimo entre turnos, limites de horas, optimização ótima) recomendo integrar OR-Tools ou formular como ILP numa iteração seguinte.
- Ajustes fáceis: ciclo da rotação, nomes de dias (PT/PT-BR), regras de restrição por operador.

Para a apresentação
- Sugestão: abre o Codespace, corre ./start-demo.sh, faz upload dos templates (templates/), escolhe um período curto (3–7 dias) e gera o horário. Faz download do XLSX e mostra o preview no frontend.

Contacto / Ajuda
- Se quiseres, eu faço:
  - adaptar fixed_days_off para PT,
  - ajustar o ciclo rotativo para 7/14/28 dias conforme uso real,
  - push automático do código para o teu repositório (preciso que o repositório exista; tu podes criá-lo e eu tento o push),
  - criar um deploy público (Render/Railway) para uma URL direta.

Licença
- MIT (muda conforme preferires).