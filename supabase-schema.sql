-- ============================================================
-- SIG — Sistema Integrado de Gestão
-- Schema completo para Supabase (PostgreSQL)
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Habilitar RLS (Row Level Security)
-- Nota: neste setup todas as tabelas permitem acesso a usuários autenticados

-- ─── CATEGORIAS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
  id   SERIAL PRIMARY KEY,
  nome TEXT NOT NULL
);

-- ─── PRODUTOS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS produtos (
  id               SERIAL PRIMARY KEY,
  sku              TEXT NOT NULL UNIQUE,
  descricao        TEXT NOT NULL,
  id_categoria     INT  REFERENCES categorias(id),
  custo_medio      NUMERIC(15,4) DEFAULT 0,
  unidade_compra   TEXT DEFAULT 'UN',
  unidade_venda    TEXT DEFAULT 'UN',
  conversao        NUMERIC(10,4) DEFAULT 1,
  preco_revenda    NUMERIC(15,4) DEFAULT 0,
  markup           NUMERIC(10,4) DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ESTOQUE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estoque (
  id_produto INT PRIMARY KEY REFERENCES produtos(id) ON DELETE CASCADE,
  qtd_atual  NUMERIC(15,4) DEFAULT 0,
  qtd_min    NUMERIC(15,4) DEFAULT 0,
  qtd_max    NUMERIC(15,4) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── FORNECEDORES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fornecedores (
  id        SERIAL PRIMARY KEY,
  nome      TEXT NOT NULL,
  cnpj      TEXT,
  email     TEXT,
  fone      TEXT,
  lead_time INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── FORNECEDORES_PRODUTO ───────────────────────────────────
CREATE TABLE IF NOT EXISTS fornecedores_produto (
  id            SERIAL PRIMARY KEY,
  id_fornecedor INT REFERENCES fornecedores(id),
  id_produto    INT REFERENCES produtos(id),
  preco         NUMERIC(15,4),
  ultimo_preco  NUMERIC(15,4),
  UNIQUE(id_fornecedor, id_produto)
);

-- ─── CLIENTES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id              SERIAL PRIMARY KEY,
  nome            TEXT NOT NULL,
  cnpj            TEXT,
  email           TEXT,
  fone            TEXT,
  limite_credito  NUMERIC(15,2) DEFAULT 0,
  tabela_preco    TEXT DEFAULT 'A',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ORÇAMENTO ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orcamento (
  id             SERIAL PRIMARY KEY,
  classe         TEXT NOT NULL,
  descricao      TEXT NOT NULL,
  vl_total       NUMERIC(15,2) DEFAULT 0,
  vl_contratado  NUMERIC(15,2) DEFAULT 0,
  vl_executado   NUMERIC(15,2) DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── REQUISICOES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS requisicoes (
  id            SERIAL PRIMARY KEY,
  id_produto    INT REFERENCES produtos(id),
  qtd           NUMERIC(15,4),
  solicitante   TEXT,
  justificativa TEXT,
  status        TEXT DEFAULT 'ABERTA',
  data          DATE DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PEDIDOS_COMPRA ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos_compra (
  id             SERIAL PRIMARY KEY,
  id_fornecedor  INT REFERENCES fornecedores(id),
  id_produto     INT REFERENCES produtos(id),
  qtd            NUMERIC(15,4),
  preco_unit     NUMERIC(15,4),
  id_orcamento   INT REFERENCES orcamento(id),
  status         TEXT DEFAULT 'AGUARDANDO_ENTREGA',
  nf             TEXT,
  data           DATE DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PEDIDOS_VENDA ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos_venda (
  id          SERIAL PRIMARY KEY,
  id_cliente  INT REFERENCES clientes(id),
  id_produto  INT REFERENCES produtos(id),
  qtd         NUMERIC(15,4),
  preco_unit  NUMERIC(15,4),
  status      TEXT DEFAULT 'RESERVADO',
  nf          TEXT,
  data        DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MOVIMENTACOES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS movimentacoes (
  id          SERIAL PRIMARY KEY,
  id_produto  INT REFERENCES produtos(id),
  tipo        CHAR(1) CHECK (tipo IN ('E','S')),
  qtd         NUMERIC(15,4),
  valor_unit  NUMERIC(15,4),
  referencia  TEXT,
  obs         TEXT,
  data        DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CONTAS_RECEBER ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contas_receber (
  id          SERIAL PRIMARY KEY,
  id_cliente  INT REFERENCES clientes(id),
  id_pedido   INT REFERENCES pedidos_venda(id),
  valor       NUMERIC(15,2),
  vencimento  DATE,
  status      TEXT DEFAULT 'ABERTO',
  nf          TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY — acesso para usuários autenticados
-- ============================================================
ALTER TABLE categorias       ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores_produto ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento        ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisicoes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_compra   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_venda    ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_receber   ENABLE ROW LEVEL SECURITY;

-- Políticas: qualquer usuário autenticado pode ler e escrever
DO $$ DECLARE t TEXT;
BEGIN FOR t IN SELECT unnest(ARRAY['categorias','produtos','estoque','fornecedores','fornecedores_produto','clientes','orcamento','requisicoes','pedidos_compra','pedidos_venda','movimentacoes','contas_receber'])
LOOP
  EXECUTE format('CREATE POLICY "auth_all_%s" ON %s FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
END LOOP; END $$;

-- ============================================================
-- DADOS INICIAIS (seed)
-- ============================================================
INSERT INTO categorias (nome) VALUES ('Informática'),('Escritório'),('Limpeza'),('Elétricos') ON CONFLICT DO NOTHING;

INSERT INTO produtos (sku, descricao, id_categoria, custo_medio, preco_revenda, markup, unidade_compra, unidade_venda, conversao) VALUES
  ('INF-001','Notebook Dell i5',        1, 3200.00, 4500.00, 40,  'UN',  'UN',  1),
  ('INF-002','Mouse Óptico USB',         1,   28.50,   55.00, 93,  'CX',  'UN', 12),
  ('ESC-001','Resma de Papel A4 500fls', 2,   22.00,   38.00, 73,  'PCT', 'UN',  5),
  ('LIM-001','Detergente 500ml',         3,    3.80,    8.50, 124, 'CX',  'UN', 24),
  ('ELE-001','Cabo HDMI 2m',             4,   18.00,   35.00, 94,  'UN',  'UN',  1)
ON CONFLICT DO NOTHING;

INSERT INTO estoque (id_produto, qtd_atual, qtd_min, qtd_max)
SELECT id, CASE sku WHEN 'INF-001' THEN 15 WHEN 'INF-002' THEN 48 WHEN 'ESC-001' THEN 8 WHEN 'LIM-001' THEN 72 WHEN 'ELE-001' THEN 3 END,
           CASE sku WHEN 'INF-001' THEN 5  WHEN 'INF-002' THEN 24 WHEN 'ESC-001' THEN 20 WHEN 'LIM-001' THEN 48 WHEN 'ELE-001' THEN 10 END,
           CASE sku WHEN 'INF-001' THEN 30 WHEN 'INF-002' THEN 120 WHEN 'ESC-001' THEN 100 WHEN 'LIM-001' THEN 240 WHEN 'ELE-001' THEN 50 END
FROM produtos WHERE sku IN ('INF-001','INF-002','ESC-001','LIM-001','ELE-001')
ON CONFLICT DO NOTHING;

INSERT INTO fornecedores (nome, cnpj, email, fone, lead_time) VALUES
  ('TechDistrib Ltda',      '12.345.678/0001-90', 'vendas@techdistrib.com',  '(11) 3333-4444', 5),
  ('PaperMax S.A.',         '98.765.432/0001-10', 'comercial@papermax.com',  '(11) 5555-6666', 3),
  ('CleanPro Distribuidora','11.222.333/0001-44', 'pedidos@cleanpro.com',    '(11) 7777-8888', 2)
ON CONFLICT DO NOTHING;

INSERT INTO clientes (nome, cnpj, email, fone, limite_credito, tabela_preco) VALUES
  ('Empresa Alpha Ltda', '55.444.333/0001-11', 'compras@alpha.com',    '(11) 9999-0001', 50000, 'A'),
  ('Beta Comércio ME',   '66.555.444/0001-22', 'financeiro@beta.com',  '(11) 9999-0002', 15000, 'B'),
  ('Gama Serviços S.A.', '77.666.555/0001-33', 'admin@gama.com',       '(11) 9999-0003', 100000,'A')
ON CONFLICT DO NOTHING;

INSERT INTO orcamento (classe, descricao, vl_total, vl_contratado, vl_executado) VALUES
  ('1.1','Tecnologia da Informação', 80000, 12400, 35200),
  ('1.2','Material de Escritório',   15000,  1800,  6500),
  ('1.3','Material de Limpeza',       8000,     0,  2100),
  ('1.4','Material Elétrico',        12000,  3200,  4800),
  ('2.1','Serviços de Terceiros',    40000,  8000, 18000)
ON CONFLICT DO NOTHING;
