import { connection } from "next/server";
import { cancelar, consultarCobranca } from "@/app/actions";
import { formatarReais } from "@/lib/dinheiro";
import { listarCategorias } from "@/lib/lancamentos";
import { listarCobrancas, modoSimulado, ROTULO_STATUS } from "@/lib/picpay";
import { FormCobranca, FormExtrato } from "./Formularios";

const COR_STATUS: Record<string, string> = {
  paid: "text-receita",
  completed: "text-receita",
  refunded: "text-perda",
  chargeback: "text-perda",
  expired: "text-suave",
};

export default async function PicPay() {
  await connection();
  const simulado = modoSimulado();
  const cobrancas = listarCobrancas();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">PicPay</h1>

      {simulado && (
        <p className="rounded-lg border border-despesa/40 bg-despesa/10 px-4 py-3 text-sm">
          <strong>Modo simulado.</strong> Sem <code>PICPAY_TOKEN</code> no <code>.env</code>, as cobranças são de
          mentira e você mesmo marca como pagas. Serve para testar o fluxo antes de ligar a conta real.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="cartao">
          <h2 className="font-medium">Gerar cobrança</h2>
          <p className="mb-4 mt-1 text-sm text-suave">
            Cria um link de pagamento. Quando o jogador pagar, o PicPay avisa o sistema e a entrada é lançada sozinha.
          </p>
          <FormCobranca categorias={listarCategorias("entrada")} />
        </section>

        <section className="cartao">
          <h2 className="font-medium">Importar extrato</h2>
          <p className="mb-4 mt-1 text-sm text-suave">
            Para Pix e transferências que não vieram de uma cobrança gerada aqui. Envie o CSV do extrato: valores
            positivos viram entrada, negativos viram saída. Reenviar o mesmo arquivo não duplica nada.
          </p>
          <FormExtrato />
        </section>
      </div>

      <section className="cartao">
        <h2 className="mb-4 font-medium">Cobranças</h2>
        {cobrancas.length ? (
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Criada</th>
                  <th>Produto</th>
                  <th>Jogador</th>
                  <th className="text-right">Valor</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cobrancas.map((c) => (
                  <tr key={c.reference_id}>
                    <td className="whitespace-nowrap text-suave">{c.criado_em.slice(0, 16).replace("T", " ")}</td>
                    <td>{c.produto}</td>
                    <td>{c.jogador}</td>
                    <td className="valor text-right">{formatarReais(c.valor_centavos)}</td>
                    <td className={COR_STATUS[c.status]}>{ROTULO_STATUS[c.status] ?? c.status}</td>
                    <td className="flex flex-wrap gap-2">
                      {c.payment_url && c.status === "created" && (
                        <a href={c.payment_url} target="_blank" className="botao-secundario">
                          {simulado ? "Simular pagamento" : "Link"}
                        </a>
                      )}
                      {!simulado && (
                        <form action={consultarCobranca}>
                          <input type="hidden" name="reference_id" value={c.reference_id} />
                          <button className="botao-secundario">Atualizar status</button>
                        </form>
                      )}
                      {(c.status === "created" || c.status === "paid" || c.status === "completed") && (
                        <form action={cancelar}>
                          <input type="hidden" name="reference_id" value={c.reference_id} />
                          <button className="botao-secundario text-perda">
                            {c.status === "created" ? "Cancelar" : "Estornar"}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-suave">Nenhuma cobrança gerada ainda.</p>
        )}
      </section>
    </div>
  );
}
