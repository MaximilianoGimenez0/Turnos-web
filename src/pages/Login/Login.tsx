import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, KeyRound } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail, validateRequiredText } from '../../utils/validators';
import Input from '../../components/common/Input/Input';
import Button from '../../components/common/Button/Button';
import Loader from '../../components/common/Loader/Loader';
import AlertModal, { type AlertModalType } from '../../components/common/AlertModal';
import { LOGIN_TEXTS } from '../../texts';
import styles from './Login.module.css';

export const Login: React.FC = () => {
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

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailValidation = validateEmail(email, true);
    if (!emailValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: LOGIN_TEXTS.validation.invalidEmailTitle,
        message: emailValidation.error || LOGIN_TEXTS.validation.invalidEmailMessage,
        type: 'warning',
      });
      return;
    }

    const passwordValidation = validateRequiredText(password, LOGIN_TEXTS.validation.passwordFieldName, 6, 100);
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
      navigate(from, { replace: true });
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
          <div className={styles.iconWrapper}>
            <Lock size={26} />
          </div>
          <h2 className={styles.title}>{LOGIN_TEXTS.header.title}</h2>
          <p className={styles.subtitle}>
            {LOGIN_TEXTS.header.subtitle}
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
            leftIcon={<Mail size={16} />}
            disabled={isSubmitting}
          />

          <Input
            label={LOGIN_TEXTS.form.passwordLabel}
            type="password"
            placeholder={LOGIN_TEXTS.form.passwordPlaceholder}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<KeyRound size={16} />}
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

        <div className={styles.demoInfo}>
          {LOGIN_TEXTS.demo.badge}
          <br />
          {LOGIN_TEXTS.demo.description}
        </div>
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
