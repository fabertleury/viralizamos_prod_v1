# Viralizamos

## Configuração Local

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

3. Crie um arquivo `.env.local` com as seguintes variáveis:
```
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
NEXT_PUBLIC_SUPABASE_SERVICE_KEY=sua_chave_de_servico_do_supabase
MERCADOPAGO_ACCESS_TOKEN=seu_token_do_mercadopago
MERCADOPAGO_SANDBOX=true_ou_false
```

4. Execute o projeto localmente:
```bash
npm run dev
```

## Deploy no Railway

1. Crie uma conta no [Railway](https://railway.app)
2. Conecte seu repositório GitHub
3. Configure as mesmas variáveis de ambiente listadas acima no Railway
4. O deploy será feito automaticamente

### Importante:
- Mantenha as mesmas versões das dependências
- Não altere a versão do Mercado Pago (atualmente usando v1.5.17)
- Certifique-se de que todas as variáveis de ambiente estão configuradas corretamente
