# Contexto da aplicação ManageOp

## Objetivo

A **ManageOp** é uma aplicação de apoio à gestão operacional da produção, concebida para centralizar informação de operadores, linhas de produção, materiais, stock, planeamento, horários e tarefas.

## Link da aplicação

`[inserir link da aplicação]`

## Funcionalidades principais

- Gestão de operadores, trabalhadores e respetivas valências.
- Gestão e acompanhamento das linhas de produção.
- Gestão de matérias-primas e materiais de embalagem.
- Identificação interna de materiais através dos códigos `MP` e `ME`.
- Registo de lotes, validades, quantidades e unidades de medida.
- Requisições entre armazém, fase intermédia e produção.
- Transferência de materiais e registo de devoluções ao armazém.
- Atualização do stock após transferências e devoluções.
- Gestão de produtos acabados, incluindo:
  - Número da palete;
  - Produto;
  - Quantidade e unidade;
  - Lote;
  - Validade;
  - Dia de produção;
  - Classificação `HQ` ou `B2B`.
- Importação de planeamento através de ficheiros Excel/CSV por URL.
- Conferência das necessidades de produção face ao stock disponível.
- Geração automática de horários semanais.
- Rotação semanal de operadores de acordo com as suas valências.
- Geração mensal de tarefas com rotação de operadores.
- Resumo das linhas de produção em funcionamento na semana corrente.

## Integração com planilhas empresariais

Está prevista a utilização de uma planilha empresarial Excel ou CSV disponibilizada através de um URL.

O link será configurado centralmente nas **Definições da aplicação** e a aplicação deverá, futuramente, utilizar essa fonte para alimentar:

- Planeamento;
- Horário;
- Férias;
- Suporte;
- Tarefas.

A integração será inicialmente realizada em **modo apenas leitura**, sem alteração dos ficheiros originais.

## Validações solicitadas à equipa de IT

Solicita-se a validação dos seguintes pontos:

1. Acessos e permissões dos utilizadores.
2. Modelo de autenticação e segurança aplicável.
3. Disponibilidade do link da aplicação na rede empresarial.
4. Possibilidade de disponibilizar ficheiros Excel/CSV através de URLs acessíveis pela aplicação.
5. Necessidade de autenticação para aceder às planilhas.
6. Compatibilidade com as políticas internas de segurança e infraestrutura.
7. Regras de firewall, proxy ou CORS que possam impedir a leitura dos ficheiros.
8. Estratégia de cópias de segurança e retenção dos dados.
9. Gestão de permissões por perfil de utilizador.
10. Necessidade de auditoria das operações de stock, transferências e devoluções.

## Considerações técnicas

- Os dados operacionais da aplicação são persistidos numa base de dados.
- As planilhas empresariais serão tratadas como fontes externas de leitura.
- A aplicação deverá validar o formato, disponibilidade e estrutura dos ficheiros importados.
- Recomenda-se definir previamente os nomes das colunas obrigatórias para cada planilha.
- Deve ser confirmado se os URLs serão públicos, internos ou protegidos por autenticação.
- O acesso às planilhas não deverá expor credenciais ou informação sensível no código da aplicação.

## Estrutura recomendada das planilhas

As colunas e formatos deverão ser acordados com a equipa de IT e os responsáveis operacionais. Como referência:

### Planeamento

- Data;
- Linha de produção;
- Produto;
- Código do produto;
- Quantidade planeada;
- Unidade;
- Turno;
- Estado.

### Horário

- Data;
- Operador;
- Linha ou posto;
- Valência;
- Hora de entrada;
- Hora de saída;
- Hora de almoço.

### Férias

- Operador;
- Data de início;
- Data de fim;
- Tipo de ausência;
- Estado.

### Suporte e tarefas

- Data;
- Tarefa;
- Área;
- Operador responsável;
- Frequência;
- Estado;
- Observações.

## Próximos passos

1. Confirmar o ambiente de alojamento e o URL oficial da aplicação.
2. Definir os responsáveis pela manutenção das planilhas.
3. Confirmar o formato e as colunas de cada ficheiro.
4. Validar o método de autenticação e acesso aos URLs.
5. Definir a frequência de sincronização dos dados.
6. Confirmar perfis de acesso e requisitos de auditoria.

---

**Documento preparado para análise da equipa de IT.**

**Aplicação:** ManageOp  
**Data:** 11/09/2026
