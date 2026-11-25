import React, { useMemo } from 'react';
import { MessageCircle } from 'lucide-react';
import { useOwnerInfo } from '../../../context/OwnerInfoContext';
import { useTenant } from '../../../context/TenantContext';
import { normalizeTenantAppearance } from '../../../services/themeEngine';
import styles from './FloatingWhatsApp.module.css';

export const FloatingWhatsApp: React.FC = () => {
  const { appearance: bootstrapAppearance } = useTenant();
  const { owner, rawOwner, isLiveSynced } = useOwnerInfo();

  const appearance = useMemo(
    () =>
      normalizeTenantAppearance(
        isLiveSynced ? rawOwner?.appearance : (rawOwner?.appearance ?? bootstrapAppearance)
      ),
    [isLiveSynced, rawOwner?.appearance, bootstrapAppearance]
  );

  const digits = useMemo(() => (owner.phone || '').replace(/\D/g, ''), [owner.phone]);

  if (!appearance.showFloatingWhatsApp || digits.length < 8) {
    return null;
  }

  const brandName = owner.businessName || owner.name || 'tu turno';
  const href = `https://wa.me/${digits}?text=${encodeURIComponent(`Hola! Te escribo desde la página de ${brandName}.`)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.floatingCta}
      aria-label={`Escribir por WhatsApp a ${brandName}`}
      title={`Consultar por WhatsApp (${brandName})`}
    >
      <MessageCircle size={20} strokeWidth={1.85} aria-hidden="true" />
      <span className={styles.label}>WhatsApp</span>
    </a>
  );
};

export default FloatingWhatsApp;
