# Cofre de Senhas

App de senhas para Android que funciona offline e guarda tudo criptografado só no celular.

- Senha mestra com PBKDF2-SHA256 (600.000 iterações) e dados em AES-256-GCM. A senha mestra nunca é salva.
- Nada é enviado para a internet: uma política de segurança (CSP) no `index.html` bloqueia qualquer conexão externa.
- Gerador de senhas, categorias, favoritas, busca, aviso de senha repetida, histórico das últimas 5 senhas de cada item.
- Bloqueio automático (1 a 15 min sem uso, ou 1 min com o app em segundo plano).
- Biometria opcional (digital/rosto) via passkey do aparelho.
- Backup em arquivo criptografado (.json) e restauração.

## 1. Publicar no GitHub Pages (uma vez, pelo computador)

1. Entre no GitHub e crie um repositório novo chamado `cofre`, **público** (GitHub Pages grátis exige repositório público; o código não contém nenhuma senha, só o app vazio).
2. Na página do repositório, clique em **Add file → Upload files** e arraste **todos os arquivos desta pasta**, incluindo a pasta `icons`. Clique em **Commit changes**.
3. Vá em **Settings → Pages**. Em *Build and deployment*, escolha **Deploy from a branch**, branch **main**, pasta **/ (root)** e clique em **Save**.
4. Em 1–2 minutos o endereço aparece no topo dessa página: `https://SEU-USUARIO.github.io/cofre/`.

**Importante:** as senhas ficam presas a esse endereço. Não troque o nome do repositório nem o usuário depois de começar a usar. Se o mesmo usuário do GitHub já publica outros sites em `SEU-USUARIO.github.io`, prefira publicar o Cofre em uma conta separada do GitHub, para ele ter um endereço só dele.

## 2. Instalar no celular

1. Abra o endereço no **Chrome** do Android.
2. Toque no menu **⋮ → Instalar app** (ou **Adicionar à tela inicial**).
3. Abra pelo ícone. A partir daí funciona sem internet.

## 3. Primeiro uso

1. Crie a senha mestra (mínimo 10 caracteres; uma frase funciona bem, ex.: `Torra media 2026 com 3 xicaras!`).
2. Em **Ajustes**, ative a **biometria** se quiser.
3. Depois de cadastrar as senhas, faça um **backup** (Ajustes → Fazer backup) e guarde o arquivo no Google Drive ou no seu e-mail. Repita de tempos em tempos; o app lembra se passar de 30 dias.

## Como restaurar em outro celular

Instale o app no celular novo, toque em **Já tenho um backup — restaurar**, escolha o arquivo e digite a senha mestra que estava em uso quando o backup foi feito.

## O que saber

- **Esqueceu a senha mestra = senhas perdidas.** Não existe recuperação. Isso é o que garante a segurança.
- **Limpar os dados do Chrome** (ou desinstalar o Chrome) apaga o cofre. O backup é o que salva você nesses casos.
- A biometria cria uma chave de acesso chamada "Cofre de Senhas" no Gerenciador de Senhas do Google. Se desativar a biometria no app, pode apagar essa chave por lá também.
- O teclado (Gboard) pode guardar o que é copiado no histórico da área de transferência. O app apaga a área de transferência após 30 s, mas não controla o histórico do teclado. Se quiser, desative o histórico em Gboard → Área de transferência.
- Este app não passou por auditoria de segurança profissional como Bitwarden ou KeePassDX. A criptografia usa as funções nativas do navegador, mas mantenha backups.

## Atualizar o app

Se mudar algum arquivo, aumente o número em `VERSION` no `sw.js` (ex.: `cofre-v1.0.1`) e envie de novo para o GitHub. O celular pega a versão nova na próxima vez que abrir o app com internet. Suas senhas não são afetadas.
