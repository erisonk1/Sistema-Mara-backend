// Item do cardápio
export type ItemCardapio = {
  id?: number;
  nome: string;
  preco: number;
  available: boolean;
  categoria_nome: string;
  porPeso?: boolean;
};

export type Cliente = {
  id?: number;
  nome: string;
  telefone: string;
};

// Item dentro da comanda
export type ItemComanda = {
  nome: string;
  quantidade: number;   // usado para itens por unidade
  preco: number;
  categoria_nome?: string;
  porPeso?: boolean;    // indica se é por peso
  peso?: number;        // usado quando porPeso = true
};

// Comanda completa
export type Comanda = {
  id?: number;
  id_cliente?: number;  // referência ao cliente cadastrado (opcional)
  nome: string;
  descricao: string;
  status: "Pendente" | "Concluído";
  itens: ItemComanda[];
  criadoEm?: string;
  formaPagamento: string;
};