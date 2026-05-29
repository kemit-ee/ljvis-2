import { useTranslation } from 'react-i18next';
import { Button, Card, Heading, TextField, TextArea } from '@tedi-design-system/react/tedi';
import type { FormikProps } from 'formik';
import styles from './ClassifierInfoEditCard.module.css';

interface ClassifierEditFormValues {
  name: string;
  description: string;
}

interface ClassifierInfoEditCardProps {
  formik: FormikProps<ClassifierEditFormValues>;
  isDesktop: boolean;
  handleSaveClick: () => void;
  onCancel: () => void;
}

export function ClassifierInfoEditCard({
  formik,
  isDesktop,
  handleSaveClick,
  onCancel,
}: ClassifierInfoEditCardProps) {
  const { t } = useTranslation();

  return (
    <form onSubmit={formik.handleSubmit}>
      <Card className="mb-1">
        <Card.Content>
          <div className={styles['card-header']}>
            <div>
              <Heading element="h3">
                {t('classifiers.data')}
              </Heading>
            </div>
          </div>

            <TextField
              id="name"
              className={isDesktop ? styles['form-name'] : 'mb-1'}
              label={t('classifiers.name')}
              value={formik.values.name}
              required
              onChange={(v) => formik.setFieldValue('name', v)}
              {...(formik.touched.name && formik.errors.name ? { helper: { text: formik.errors.name, type: 'error' as const } } : {})}
            />
            <TextArea
              id="description"
              className={isDesktop ? styles['form-name'] : 'mb-1'}
              label={t('classifiers.description')}
              value={formik.values.description}
              required
              onChange={(v) => formik.setFieldValue('description', v)}
              {...(formik.touched.description && formik.errors.description ? { helper: { text: formik.errors.description, type: 'error' as const } } : {})}
            />

          <div className={`${styles['form-actions']}${!isDesktop ? ` ${styles['form-actions-mobile']}` : ''}`}>
            <Button
              type="button"
              size="small"
              visualType="link"
              onClick={onCancel}
            >
              {t('classifiers.cancel')}
            </Button>
            <Button type="button" size="small" onClick={handleSaveClick}>{t('classifiers.save')}</Button>
          </div>
        </Card.Content>
      </Card>
    </form>
  );
}
