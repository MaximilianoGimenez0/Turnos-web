import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ChevronDown,
  HelpCircle,
  Mail,
  MessageCircle,
  Search,
  User,
  X,
} from 'lucide-react';
import { DEFAULT_DEMO_SLUG } from '../../config/tenantConstants';
import { buildTenantPath } from '../../services/tenantService';
import { filterHelpCategories, countHelpItems } from '../../utils/helpSearch';
import { HELP_TEXTS, type HelpAudienceId } from '../../texts/pages/Help';
import Button from '../../components/common/Button/Button';
import ThemeSwitcher from '../../components/common/ThemeSwitcher/ThemeSwitcher';
import Footer from '../../components/common/Footer/Footer';
import styles from './HelpView.module.css';

export const HelpView: React.FC = () => {
  const location = useLocation();
  const originPath = (location.state as { from?: string } | null)?.from;

  const [audience, setAudience] = useState<HelpAudienceId>('business');
  const [searchQuery, setSearchQuery] = useState('');
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    'biz-login': true,
    'cli-how-to-book': true,
  });

  const activeCategories = HELP_TEXTS.categories[audience];

  const filteredCategories = useMemo(
    () => filterHelpCategories(activeCategories, searchQuery),
    [activeCategories, searchQuery]
  );

  const totalResults = useMemo(() => countHelpItems(filteredCategories), [filteredCategories]);
  const hasQuery = searchQuery.trim().length > 0;

  const toggleItem = (itemId: string) => {
    setOpenIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          <Link
            to={originPath && originPath !== '/ayuda' ? originPath : '/'}
            className={styles.backLink}
          >
            <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>{originPath ? HELP_TEXTS.topBar.backToOrigin : HELP_TEXTS.topBar.backToLanding}</span>
          </Link>

          <div className={styles.topActions}>
            <ThemeSwitcher />
            <Link to={buildTenantPath(DEFAULT_DEMO_SLUG)} className={styles.demoLink}>
              <Button variant="primary" size="sm" rightIcon={<ArrowRight size={14} />}>
                {HELP_TEXTS.topBar.demoCta}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.badge}>
            <HelpCircle size={14} strokeWidth={1.8} aria-hidden="true" />
            <span>{HELP_TEXTS.hero.badge}</span>
          </span>
          <h1 className={styles.title}>{HELP_TEXTS.hero.title}</h1>
          <p className={styles.subtitle}>{HELP_TEXTS.hero.subtitle}</p>

          <div className={styles.searchBox}>
            <Search size={18} strokeWidth={1.75} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={HELP_TEXTS.search.placeholder}
              aria-label={HELP_TEXTS.search.ariaLabel}
              className={styles.searchInput}
            />
            {hasQuery && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearchQuery('')}
                aria-label={HELP_TEXTS.search.clearAriaLabel}
              >
                <X size={15} strokeWidth={1.9} aria-hidden="true" />
              </button>
            )}
          </div>

          <div
            className={styles.audienceTabs}
            role="tablist"
            aria-label={HELP_TEXTS.audiences.ariaLabel}
          >
            <button
              type="button"
              role="tab"
              id="help-tab-business"
              aria-selected={audience === 'business'}
              aria-controls="help-panel-content"
              className={`${styles.audienceTab} ${audience === 'business' ? styles.audienceTabActive : ''}`}
              onClick={() => setAudience('business')}
            >
              <Building2 size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>{HELP_TEXTS.audiences.business.label}</span>
            </button>

            <button
              type="button"
              role="tab"
              id="help-tab-client"
              aria-selected={audience === 'client'}
              aria-controls="help-panel-content"
              className={`${styles.audienceTab} ${audience === 'client' ? styles.audienceTabActive : ''}`}
              onClick={() => setAudience('client')}
            >
              <User size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>{HELP_TEXTS.audiences.client.label}</span>
            </button>
          </div>
        </section>

        <section
          id="help-panel-content"
          role="tabpanel"
          aria-labelledby={audience === 'business' ? 'help-tab-business' : 'help-tab-client'}
          className={styles.contentSection}
        >
          {hasQuery && (
            <p className={styles.resultsCounter} role="status">
              {HELP_TEXTS.search.resultsCount(totalResults)}
            </p>
          )}

          {filteredCategories.length === 0 ? (
            <div className={styles.emptyCard}>
              <HelpCircle size={28} strokeWidth={1.5} className={styles.emptyIcon} aria-hidden="true" />
              <h2 className={styles.emptyTitle}>{HELP_TEXTS.search.emptyTitle}</h2>
              <p className={styles.emptyDesc}>{HELP_TEXTS.search.emptyDescription}</p>
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                {HELP_TEXTS.search.emptyReset}
              </Button>
            </div>
          ) : (
            <div className={styles.categoriesStack}>
              {filteredCategories.map((category) => (
                <article key={category.id} className={styles.categoryCard}>
                  <div className={styles.categoryHeader}>
                    <h2 className={styles.categoryTitle}>{category.title}</h2>
                    <p className={styles.categoryDesc}>{category.description}</p>
                  </div>

                  <div className={styles.accordionList}>
                    {category.items.map((item) => {
                      const isExpanded = hasQuery || Boolean(openIds[item.id]);
                      const panelId = `help-answer-${item.id}`;
                      return (
                        <div key={item.id} className={styles.accordionItem}>
                          <button
                            type="button"
                            className={styles.accordionTrigger}
                            aria-expanded={isExpanded}
                            aria-controls={panelId}
                            onClick={() => toggleItem(item.id)}
                          >
                            <span className={styles.questionText}>{item.question}</span>
                            <ChevronDown
                              size={18}
                              strokeWidth={1.75}
                              className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}
                              aria-hidden="true"
                            />
                          </button>
                          {isExpanded && (
                            <div id={panelId} className={styles.accordionPanel}>
                              <p className={styles.answerText}>{item.answer}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.supportCard} aria-labelledby="help-support-title">
          <div className={styles.supportContent}>
            <span className={styles.supportBadge}>{HELP_TEXTS.support.badge}</span>
            <h2 id="help-support-title" className={styles.supportTitle}>
              {HELP_TEXTS.support.title}
            </h2>
            <p className={styles.supportDesc}>{HELP_TEXTS.support.description}</p>
          </div>

          <div className={styles.supportActions}>
            <a
              href={HELP_TEXTS.support.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.supportLink}
            >
              <Button variant="primary" size="md" leftIcon={<MessageCircle size={16} />}>
                {HELP_TEXTS.support.whatsappCta}
              </Button>
            </a>
            <a href={HELP_TEXTS.support.emailHref} className={styles.supportLink}>
              <Button variant="outline" size="md" leftIcon={<Mail size={16} />}>
                {HELP_TEXTS.support.emailCta}
              </Button>
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HelpView;
