import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { DEFAULT_DEMO_SLUG } from '../../config/tenantConstants';
import { buildTenantPath } from '../../services/tenantService';
import { validateEmail, validateRequiredText } from '../../utils/validators';
import { FIELD_LIMITS } from '../../config/fieldLimits';
import Input from '../../components/common/Input/Input';
import Button from '../../components/common/Button/Button';
import Loader from '../../components/common/Loader/Loader';
import ThemeSwitcher from '../../components/common/ThemeSwitcher/ThemeSwitcher';
import AlertModal, { type AlertModalType } from '../../components/common/AlertModal';
import { SUPERADMIN_TEXTS } from '../../texts/pages/SuperAdmin';
import loginStyles from '../Login/Login.module.css';
import layoutStyles from '../../layouts/LoginLayout/LoginLayout.module.css';

export const SuperAdminLogin: React.FC = () => {
  const { isAuthenticated, isPlatformAdmin, claims, loading: authLoading, login, refreshClaims } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: AlertModalType;
  }>({
    isOpen: false,
    message: '',
    type: 'warning',
  });

  const requestedFrom = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const targetPath =
    requestedFrom &&
    requestedFrom.toLowerCase().startsWith('/superadmin') &&
    !requestedFrom.toLowerCase().startsWith('/superadmin/login')
      ? requestedFrom
      : '/superadmin';

  if (!isSubmitting && !authLoading && isAuthenticated && (isPlatformAdmin || claims.platformAdmin)) {
    return <Navigate to={targetPath} replace />;
  }

  const closeAlert = () => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailValidation = validateEmail(email, true, FIELD_LIMITS.auth.email.max);
    if (!emailValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: SUPERADMIN_TEXTS.login.validation.invalidEmailTitle,
        message: emailValidation.error || SUPERADMIN_TEXTS.login.validation.invalidEmailMessage,
        type: 'warning',
      });
      return;
    }

    const passwordValidation = validateRequiredText(
      password,
      SUPERADMIN_TEXTS.login.validation.passwordFieldName,
      FIELD_LIMITS.auth.password.min,
      FIELD_LIMITS.auth.password.max
    );
    if (!passwordValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: SUPERADMIN_TEXTS.login.validation.requiredPasswordTitle,
        message:
          passwordValidation.error || SUPERADMIN_TEXTS.login.validation.requiredPasswordMessage,
        type: 'warning',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const loggedUser = await login(email.trim(), password);
      if (!loggedUser.platformAdmin) {
        await refreshClaims();
      }
      navigate(targetPath, { replace: true });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : SUPERADMIN_TEXTS.login.errors.authFallback;
      setAlertState({
        isOpen: true,
        title: SUPERADMIN_TEXTS.login.errors.authTitle,
        message: msg,
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={layoutStyles.layout}>
      <header className={layoutStyles.topBar}>
        <Link to={buildTenantPath(DEFAULT_DEMO_SLUG)} className={layoutStyles.backLink}>
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          <span>{SUPERADMIN_TEXTS.login.backToDemo}</span>
        </Link>
        <ThemeSwitcher />
      </header>

      <main className={layoutStyles.mainContent}>
        <div className={loginStyles.container}>
          <div className={loginStyles.loginCard}>
            <div className={loginStyles.header}>
              <div className={loginStyles.iconWrapper} aria-hidden="true">
                <ShieldCheck size={22} strokeWidth={1.6} />
              </div>
              <span className={loginStyles.demoBadge}>{SUPERADMIN_TEXTS.login.badge}</span>
              <h1 className={loginStyles.title}>{SUPERADMIN_TEXTS.login.title}</h1>
              <p className={loginStyles.subtitle}>{SUPERADMIN_TEXTS.login.subtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className={loginStyles.form}>
              <Input
                label={SUPERADMIN_TEXTS.login.emailLabel}
                type="email"
                placeholder={SUPERADMIN_TEXTS.login.emailPlaceholder}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={FIELD_LIMITS.auth.email.max}
                leftIcon={<Mail size={16} strokeWidth={1.5} />}
                disabled={isSubmitting}
                autoComplete="username"
              />

              <Input
                label={SUPERADMIN_TEXTS.login.passwordLabel}
                type="password"
                placeholder={SUPERADMIN_TEXTS.login.passwordPlaceholder}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={FIELD_LIMITS.auth.password.max}
                leftIcon={<KeyRound size={16} strokeWidth={1.5} />}
                disabled={isSubmitting}
                autoComplete="current-password"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isSubmitting}
              >
                {SUPERADMIN_TEXTS.login.submitButton}
              </Button>
            </form>
          </div>
        </div>
      </main>

      {isSubmitting && (
        <Loader
          fullScreen
          title={SUPERADMIN_TEXTS.login.loaderTitle}
          subtitle={SUPERADMIN_TEXTS.login.loaderSubtitle}
          icon="shield"
        />
      )}

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />
    </div>
  );
};

export default SuperAdminLogin;
