# Finanças do Hotel

Gestão de entradas, saídas e perdas de um hotel Habbo. As entradas chegam pelo extrato do PicPay em CSV (conta pessoa física) ou, com conta PicPay Empresas, por cobrança automática.

## O que faz

- **Painel**: entradas, saídas, perdas e saldo do período, gráfico por dia e quem mais comprou.
- **Lançamentos**: lista com filtro por período, tipo, categoria e busca por descrição, nick ou raro. Os botões do topo (Registrar entrada, saída ou perda) abrem o formulário já no tipo certo, com o nome do raro (ganho, comprado ou perdido) e o valor.
- **Perdas**: tipo próprio de lançamento (golpe, comprovante falso, calote, estorno), separado das despesas normais, para o relatório mostrar quanto se perdeu e não só quanto se gastou.
- **Relatórios**: mês a mês, por categoria, por jogador, margem e perdas sobre entradas. Exporta CSV que abre direto no Excel.
- **Importar CSV** (`/importar`): envie o extrato ou cole o conteúdo. Aparece uma prévia e nada é gravado antes de você confirmar. Na prévia:
  - entradas vêm marcadas; saídas vêm desmarcadas, porque numa conta pessoal elas misturam gastos que não são do hotel;
  - cada saída pode ser marcada como Saída ou Perda, e cada linha recebe uma categoria (uma a uma ou todas de uma vez);
  - linhas já importadas aparecem como "já importada" e não entram de novo.

  As colunas são achadas pelo nome: Data e Valor (ou Entrada e Saída separadas), mais Descrição e Jogador/Nome/Pagador se houver. Uma coluna Tipo com "enviado", "pagamento" ou "débito" transforma o valor em saída. Separador `;`, `,` ou tab. Se o PicPay só entregar o extrato em PDF, baixe a planilha modelo na própria página e preencha.
- **PicPay Empresas** (`/picpay`, opcional): gera link de pagamento. Quando o jogador paga, o PicPay avisa o sistema e a entrada é lançada sozinha. Estorno e chargeback viram perda.

## Rodar

```bash
pnpm install
pnpm dev                # http://localhost:3000/importar
```

Requer Node 22.5 ou mais novo (o banco é o SQLite embutido no Node, `node:sqlite`). O arquivo fica em `data/financas.db`: faça backup dele. O `.env` só é necessário para senha de acesso (`APP_SENHA`) e para o PicPay Empresas; veja `.env.example`.

## Ligar o PicPay Empresas (opcional)

1. A integração usa a **API de E-commerce do PicPay**, que exige conta **PicPay Empresas** (lojista). Conta pessoa física não tem API: nesse caso use só a importação de CSV.
2. No painel do lojista, pegue o `x-picpay-token` e o `x-seller-token` e coloque em `PICPAY_TOKEN` e `PICPAY_SELLER_TOKEN`.
3. Publique o sistema num endereço público com HTTPS e coloque em `APP_URL`. O PicPay chama `APP_URL/api/picpay/callback` a cada mudança de pagamento.
4. O retorno do PicPay não é aceito de olhos fechados: o sistema confere o `x-seller-token` e depois consulta o status na API antes de lançar.

## Hospedagem

SQLite precisa de disco persistente: VPS, Railway ou Fly.io com volume. Vercel não serve (o disco é apagado a cada deploy). Defina `APP_SENHA` antes de expor na internet.

## Estrutura

```
src/lib/db.ts           esquema do banco e categorias iniciais
src/lib/lancamentos.ts  consultas e totais
src/lib/picpay.ts       cliente PicPay + modo simulado
src/lib/extrato.ts      leitura do CSV (prévia) e gravação das linhas confirmadas
src/app/importar        tela de importação
src/app/actions.ts      ações dos formulários
src/app/api/picpay/callback  retorno do PicPay
src/proxy.ts            senha de acesso
```
