/*
 * Script clássico (não é módulo) carregado no <head>, antes da primeira
 * pintura. Fica num arquivo para a política de segurança (CSP) do
 * index.html poder proibir qualquer script embutido na página.
 */
(() => {
  // O tema claro é o padrão; aplica o tema salvo antes de pintar, sem "flash" de tema errado.
  try {
    const theme = JSON.parse(localStorage.getItem('doc-studio:app-theme'));
    if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
    else if (theme === 'auto') delete document.documentElement.dataset.theme;
  } catch { /* armazenamento bloqueado: mantém o tema claro */ }

  const finishBoot = () => document.getElementById('boot')?.classList.add('is-done');
  document.addEventListener('DOMContentLoaded', () => {
    // Aberto direto do disco (file://), os módulos ES não carregam: mostra como abrir pelo servidor.
    if (location.protocol === 'file:') {
      document.getElementById('file-warning').hidden = false;
      finishBoot();
    }
  });
  // Garantia: se o script principal não carregar (navegador antigo, erro de rede), a tela de abertura sai.
  setTimeout(finishBoot, 8000);
})();
