import { apagarLancamento } from "@/app/actions";
import { formatarData, formatarReais } from "@/lib/dinheiro";
import type { Lancamento } from "@/lib/lancamentos";

const ETIQUETA = {
  receita: { texto: "Entrada", cor: "text-receita" },
  despesa: { texto: "Saída", cor: "text-despesa" },
  perda: { texto: "Perda", cor: "text-perda" },
} as const;

const ORIGEM: Record<string, string> = {
  manual: "Manual",
  picpay_cobranca: "PicPay (cobrança)",
  picpay_extrato: "PicPay (extrato)",
};

export function TabelaLancamentos({ linhas, excluir = false }: { linhas: Lancamento[]; excluir?: boolean }) {
  if (!linhas.length) return <p className="text-sm text-suave">Nenhum lançamento encontrado.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="tabela">
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Jogador</th>
            <th className="text-right">Valor</th>
            <th>Origem</th>
            {excluir && <th />}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => {
            const e = ETIQUETA[l.natureza];
            return (
              <tr key={l.id}>
                <td className="whitespace-nowrap">{formatarData(l.data)}</td>
                <td className={`font-medium ${e.cor}`}>{e.texto}</td>
                <td>{l.descricao}</td>
                <td className="text-suave">{l.categoria_nome ?? "—"}</td>
                <td>{l.jogador ?? ""}</td>
                <td className={`valor text-right ${e.cor}`}>
                  {l.natureza === "receita" ? "+" : "−"} {formatarReais(l.valor_centavos)}
                </td>
                <td className="text-xs text-suave">{ORIGEM[l.origem]}</td>
                {excluir && (
                  <td>
                    <form action={apagarLancamento}>
                      <input type="hidden" name="id" value={l.id} />
                      <button className="text-xs text-suave hover:text-perda" title="Excluir lançamento">
                        excluir
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
