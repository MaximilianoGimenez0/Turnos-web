import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Mail,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { FIELD_LIMITS } from '../../../config/fieldLimits';
import {
  submitOnboardingRequest,
  validateOnboardingRequestInput,
  type OnboardingRequestField,
} from '../../../services/onboardingRequestService';
import { extractCallableErrorMessage } from '../../../services/superadminService';
import { LANDING_TEXTS } from '../../../texts/pages/Landing';
import type { SubmitOnboardingRequestResponse } from '../../../types';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Textarea from '../../../components/common/Textarea/Textarea';
import styles from './LandingContractForm.module.css';

interface LandingContractFormProps {
  demoPath: string;
}

export const LandingContractForm: React.FC<LandingContractFormProps> = ({ demoPath }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [website, setWebsite] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<OnboardingRequestField, string>>>(
    {}
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{
    email: string;
    response: SubmitOnboardingRequestResponse;
  } | null>(null);

  const texts = LANDING_TEXTS.contractForm;
  const limits = FIELD_LIMITS.onboardingRequest;

  const clearFieldError = (field: OnboardingRequestField) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (submitError) {
      setSubmitError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const payload = {
      name,
      email,
      phone,
      notes,
      website,
    };

    const validation = validateOnboardingRequestInput(payload);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const response = await submitOnboardingRequest(payload);
      setSubmittedResult({
        email: email.trim().toLowerCase(),
        response,
      });
    } catch (err: unknown) {
      setSubmitError(extractCallableErrorMessage(err, texts.genericError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendAnother = () => {
    setName('');
    setEmail('');
    setPhone('');
    setNotes('');
    setWebsite('');
    setFieldErrors({});
    setSubmitError(null);
    setSubmittedResult(null);
  };

  return (
    <section id="contratar" className={styles.contractSection} aria-labelledby="contract-title">
      <div className={styles.contractGrid}>
        <div className={styles.contractIntro}>
          <span className={styles.eyebrow}>{texts.eyebrow}</span>
          <h2 id="contract-title" className={styles.title}>
            {texts.title}
          </h2>
          <p className={styles.subtitle}>{texts.subtitle}</p>

          <ul className={styles.highlightsList}>
            {texts.highlights.map((item) => (
              <li key={item} className={styles.highlightItem}>
                <ShieldCheck
                  size={16}
                  strokeWidth={1.85}
                  className={styles.highlightIcon}
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.formCard}>
          {submittedResult ? (
            <div className={styles.successCard} role="status" aria-live="polite">
              <div className={styles.successHeader}>
                <div className={styles.successIconWrap} aria-hidden="true">
                  <CheckCircle2 size={24} strokeWidth={1.8} />
                </div>
                <span className={styles.successBadge}>{texts.success.badge}</span>
                <h3 className={styles.successTitle}>{texts.success.title}</h3>
                <p className={styles.successSubtitle}>
                  {texts.success.subtitlePrefix} <strong>{submittedResult.email}</strong>
                </p>
              </div>

              <div className={styles.requestCodeBox}>
                <span className={styles.requestCodeLabel}>{texts.success.requestCodeLabel}</span>
                <code className={styles.requestCodeValue}>{submittedResult.response.requestId}</code>
              </div>

              <div className={styles.spamWarningBox}>
                <Mail size={17} strokeWidth={1.8} aria-hidden="true" />
                <div className={styles.spamWarningText}>
                  <strong>{texts.success.spamWarningTitle}</strong>
                  <span>{texts.success.spamWarningBody}</span>
                </div>
              </div>

              <div className={styles.successActions}>
                <Link to={demoPath} className={styles.linkReset}>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    fullWidth
                    rightIcon={<ArrowRight size={15} />}
                  >
                    {texts.success.demoCta}
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={handleSendAnother}
                >
                  {texts.success.sendAnotherCta}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              {submitError && (
                <div className={styles.errorBanner} role="alert">
                  <AlertTriangle size={16} strokeWidth={1.8} aria-hidden="true" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className={styles.honeypotField} aria-hidden="true">
                <label htmlFor="contract-website">Sitio web</label>
                <input
                  id="contract-website"
                  name="website"
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <Input
                id="contract-name"
                label={texts.fields.nameLabel}
                placeholder={texts.fields.namePlaceholder}
                required
                value={name}
                maxLength={limits.name.max}
                error={fieldErrors.name}
                disabled={isSubmitting}
                autoComplete="name"
                onChange={(e) => {
                  setName(e.target.value);
                  clearFieldError('name');
                }}
              />

              <div className={styles.formRow}>
                <Input
                  id="contract-email"
                  type="email"
                  label={texts.fields.emailLabel}
                  placeholder={texts.fields.emailPlaceholder}
                  required
                  value={email}
                  maxLength={limits.email.max}
                  error={fieldErrors.email}
                  disabled={isSubmitting}
                  autoComplete="email"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError('email');
                  }}
                />

                <Input
                  id="contract-phone"
                  type="tel"
                  phoneOnly
                  label={texts.fields.phoneLabel}
                  placeholder={texts.fields.phonePlaceholder}
                  required
                  value={phone}
                  maxLength={limits.phone.max}
                  error={fieldErrors.phone}
                  disabled={isSubmitting}
                  autoComplete="tel"
                  onChange={(e) => {
                    setPhone(e.target.value);
                    clearFieldError('phone');
                  }}
                />
              </div>

              <Textarea
                id="contract-notes"
                label={texts.fields.notesLabel}
                placeholder={texts.fields.notesPlaceholder}
                value={notes}
                maxLength={limits.notes.max}
                showCharCount
                rows={3}
                error={fieldErrors.notes}
                disabled={isSubmitting}
                onChange={(e) => {
                  setNotes(e.target.value);
                  clearFieldError('notes');
                }}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isSubmitting}
                rightIcon={!isSubmitting ? <ArrowRight size={16} /> : undefined}
              >
                {isSubmitting ? texts.submittingCta : texts.submitCta}
              </Button>
            </form>
          )}
        </div>

        <div className={styles.alternativeBox}>
          <span className={styles.alternativeLabel}>{texts.alternativeTitle}</span>
          <div className={styles.alternativeActions}>
            <Link to={demoPath} className={styles.linkReset}>
              <Button variant="outline" size="md" rightIcon={<ArrowRight size={15} />}>
                {texts.demoCta}
              </Button>
            </Link>
            <a
              href={LANDING_TEXTS.hero.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.linkReset}
            >
              <Button variant="ghost" size="md" leftIcon={<MessageCircle size={15} />}>
                {texts.whatsappCta}
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingContractForm;
