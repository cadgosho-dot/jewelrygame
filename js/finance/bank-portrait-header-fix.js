const STYLE_ID = 'jxj-bank-portrait-header-fix-v1';

function installBankPortraitHeaderFix() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (orientation: portrait), (max-aspect-ratio: 1/1) {
      #jxj-bank-screen > .game-header.jxj-bank-header {
        height: var(--jwj-two-bar-total-height) !important;
        min-height: var(--jwj-two-bar-total-height) !important;
        max-height: var(--jwj-two-bar-total-height) !important;
        grid-template-columns: minmax(0, 1fr) auto !important;
        grid-template-rows: var(--jwj-two-bar-info-height) var(--jwj-two-bar-action-height) !important;
        grid-template-areas: "status money" "center center" !important;
        column-gap: clamp(4px, 1.5vw, 8px) !important;
        row-gap: var(--jwj-two-bar-gap) !important;
        padding: 0 !important;
        overflow: visible !important;
      }

      #jxj-bank-screen > .game-header.jxj-bank-header .status-left {
        grid-area: status !important;
        align-self: stretch !important;
        min-width: 0 !important;
      }

      #jxj-bank-screen > .game-header.jxj-bank-header .header-money-area {
        grid-area: money !important;
        align-self: stretch !important;
        min-height: 0 !important;
      }

      #jxj-bank-screen > .game-header.jxj-bank-header .header-center {
        grid-area: center !important;
        align-self: stretch !important;
        display: grid !important;
        grid-template-columns: clamp(34px, 10vw, 40px) minmax(0, 1fr) auto !important;
        align-items: center !important;
        width: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        gap: clamp(4px, 1.5vw, 8px) !important;
        padding: clamp(3px, .9vw, 5px) clamp(6px, 1.8vw, 9px) !important;
      }

      #jxj-bank-screen > .game-header.jxj-bank-header .header-center > [data-bank-close] {
        position: static !important;
        grid-column: 1 !important;
        justify-self: start !important;
        width: clamp(34px, 10vw, 40px) !important;
        height: clamp(34px, 10vw, 40px) !important;
        min-width: clamp(34px, 10vw, 40px) !important;
        min-height: clamp(34px, 10vw, 40px) !important;
        padding: 0 !important;
        margin: 0 !important;
        transform: none !important;
      }

      #jxj-bank-screen > .game-header.jxj-bank-header .header-title {
        grid-column: 2 !important;
        justify-self: stretch !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        text-align: center !important;
      }

      #jxj-bank-screen > .game-header.jxj-bank-header .header-title strong {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      #jxj-bank-screen > .game-header.jxj-bank-header .header-help-button {
        display: none !important;
      }

      #jxj-bank-screen > .game-header.jxj-bank-header .header-primary-actions {
        display: none !important;
      }

      #jxj-bank-screen > .game-header.jxj-bank-header .header-secondary-actions {
        position: static !important;
        grid-column: 3 !important;
        justify-self: end !important;
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        width: auto !important;
        min-width: max-content !important;
        margin: 0 !important;
      }

      #jxj-bank-screen > .game-header.jxj-bank-header .header-secondary-actions .header-main-button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
    }
  `;
  document.head.appendChild(style);
}

installBankPortraitHeaderFix();

export { installBankPortraitHeaderFix };
