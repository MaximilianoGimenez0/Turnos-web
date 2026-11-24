import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, KeyRound } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../context/TenantContext';
import { useOwnerInfo } from '../../context/OwnerInfoContext';
import { buildTenantPath } from '../../services/tenantService';
import { validateEmail, validateRequiredText } from '../../utils/validators';
import { FIELD_LIMITS } from '../../config/fieldLimits';
import Input from '../../components/common/Input/Input';
import Button from '../../components/common/Button/Button';
import Loader from '../../components/common/Loader/Loader';
import AlertModal, { type AlertModalType } from '../../components/common/AlertModal';
import { LOGIN_TEXTS } from '../../texts';
import styles from './Login.module.css';

export const Login: React.FC = () => {
  const { slug, name: tenantName, isDemo } = useTenant();
  const { rawOwner } = useOwnerInfo();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: AlertModalType;
    details?: string[];
  }>({
    isOpen: false,
    message: '',
    type: 'warning',
  });

  const closeAlert = () => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  };

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const tenantBasePath = buildTenantPath(slug);
  const defaultAdminPath = buildTenantPath(slug, '/admin');
  const requestedFrom = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const targetPath =
    requestedFrom &&
    requestedFrom.toLowerCase().startsWith(`${tenantBasePath.toLowerCase()}/`)
      ? requestedFrom
      : defaultAdminPath;

  const businessName = rawOwner?.businessName?.trim() || tenantName;
  const customLogoUrl = rawOwner?.logoUrl?.trim() || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailValidation = validateEmail(email, true, FIELD_LIMITS.auth.email.max);
    if (!emailValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: LOGIN_TEXTS.validation.invalidEmailTitle,
        message: emailValidation.error || LOGIN_TEXTS.validation.invalidEmailMessage,
        type: 'warning',
      });
      return;
    }

    const passwordValidation = validateRequiredText(
      password,
      LOGIN_TEXTS.validation.passwordFieldName,
      FIELD_LIMITS.auth.password.min,
      FIELD_LIMITS.auth.password.max
    );
    if (!passwordValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: LOGIN_TEXTS.validation.requiredPasswordTitle,
        message: passwordValidation.error || LOGIN_TEXTS.validation.requiredPasswordMessage,
        type: 'warning',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate(targetPath, { replace: true });
    } catch (err: unknown) {
      console.error(LOGIN_TEXTS.errors.logError, err);
      const msg =
        err instanceof Error
          ? err.message
          : LOGIN_TEXTS.errors.authFallback;
      setAlertState({
        isOpen: true,
        title: LOGIN_TEXTS.errors.authTitle,
        message: msg,
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <div className={styles.iconWrapper} aria-hidden="true">
            {customLogoUrl ? (
              <img src={customLogoUrl} alt={businessName} className={styles.brandLogo} />
            ) : (
              <Lock size={20} strokeWidth={1.5} />
            )}
          </div>
          <h2 className={styles.title}>{LOGIN_TEXTS.header.title}</h2>
          <p className={styles.subtitle}>
            {businessName
              ? LOGIN_TEXTS.header.subtitleWithBusiness(businessName)
              : LOGIN_TEXTS.header.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label={LOGIN_TEXTS.form.emailLabel}
            type="email"
            placeholder={LOGIN_TEXTS.form.emailPlaceholder}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={FIELD_LIMITS.auth.email.max}
            leftIcon={<Mail size={16} strokeWidth={1.5} />}
            disabled={isSubmitting}
          />

          <Input
            label={LOGIN_TEXTS.form.passwordLabel}
            type="password"
            placeholder={LOGIN_TEXTS.form.passwordPlaceholder}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={FIELD_LIMITS.auth.password.max}
            leftIcon={<KeyRound size={16} strokeWidth={1.5} />}
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isSubmitting}
          >
            {LOGIN_TEXTS.form.submitButton}
          </Button>
        </form>

        {isDemo && (
          <div className={styles.demoInfo}>
            <span className={styles.demoBadge}>{LOGIN_TEXTS.demo.badge}</span>
            <span>{LOGIN_TEXTS.demo.description}</span>
          </div>
        )}
      </div>

      {isSubmitting && (
        <Loader
          fullScreen
          title={LOGIN_TEXTS.loader.title}
          subtitle={LOGIN_TEXTS.loader.subtitle}
          icon="shield"
        />
      )}

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        details={alertState.details}
      />
    </div>
  );
};

export default Login;
