export const scrollToContractForm = (): void => {
  const section = document.getElementById('contratar');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  window.setTimeout(() => {
    const nameInput = document.getElementById('contract-name') as HTMLInputElement | null;
    if (nameInput) {
      nameInput.focus({ preventScroll: true });
    }
  }, 350);
};
