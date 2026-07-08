import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Heading,
  TextField,
} from '@tedi-design-system/react/tedi';
import { DatePicker } from '@tedi-design-system/react/community';
import type { FormikProps } from 'formik';
import styles from './ClassifierValueInfoCard.module.css';
import dayjs from 'dayjs';

interface ClassifierValueFormValues {
  id: string;
  code: string;
  name: string;
  validFrom: string;
  validUntil: string;
}

interface ClassifierValueInfoCardProps {
  formik: FormikProps<ClassifierValueFormValues>;
  isDesktop: boolean;
  isEdit: boolean;
  handleSaveClick: () => void;
  onCancel: () => void;
}

export function ClassifierValueInfoCard({
  formik,
  isDesktop,
  isEdit,
  handleSaveClick,
  onCancel,
}: ClassifierValueInfoCardProps) {
  const { t } = useTranslation();

  return (
    <form onSubmit={formik.handleSubmit}>
      <Card className="mb-1">
        <Card.Content>
          <div className={styles['card-header']}>
            <div>
              <Heading element="h3">{t('classifiers.valueData')}</Heading>
            </div>
          </div>

          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'] +
              ' mb-1'
            }
          >
            <TextField
              id="code"
              label={t('classifiers.code')}
              value={formik.values.code}
              required
              disabled={isEdit}
              onChange={(v) => formik.setFieldValue('code', v)}
              {...(formik.touched.code && formik.errors.code
                ? {
                    helper: {
                      text: formik.errors.code,
                      type: 'error' as const,
                    },
                  }
                : {})}
            />
            <TextField
              id="name"
              label={t('classifiers.name')}
              value={formik.values.name}
              required
              disabled={isEdit}
              onChange={(v) => formik.setFieldValue('name', v)}
              {...(formik.touched.name && formik.errors.name
                ? {
                    helper: {
                      text: formik.errors.name,
                      type: 'error' as const,
                    },
                  }
                : {})}
            />
          </div>
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            <div
              className={
                styles[isDesktop ? 'date-row-desktop' : 'date-row-mobile']
              }
            >
              <DatePicker
                id="validFrom"
                label={t('classifiers.validFrom')}
                value={
                  formik.values.validFrom
                    ? dayjs(formik.values.validFrom)
                    : null
                }
                onChange={(v) => formik.setFieldValue('validFrom', v)}
                placeholder={t('users.datePickerPlaceholder')}
                required
                {...(formik.touched.validFrom && formik.errors.validFrom
                  ? {
                      helper: {
                        text: formik.errors.validFrom,
                        type: 'error' as const,
                      },
                    }
                  : {})}
              />
              <DatePicker
                id="validUntil"
                label={t('classifiers.validUntil')}
                value={
                  formik.values.validUntil
                    ? dayjs(formik.values.validUntil)
                    : null
                }
                onChange={(v) => formik.setFieldValue('validUntil', v)}
                placeholder={t('users.datePickerPlaceholder')}
                {...(formik.touched.validUntil && formik.errors.validUntil
                  ? {
                      helper: {
                        text: formik.errors.validUntil,
                        type: 'error' as const,
                      },
                    }
                  : {})}
              />
            </div>
          </div>

          <div
            className={`${styles['form-actions']}${!isDesktop ? ` ${styles['form-actions-mobile']}` : ''}`}
          >
            <Button
              type="button"
              size="small"
              visualType="link"
              onClick={onCancel}
            >
              {t('classifiers.cancel')}
            </Button>
            <Button type="button" size="small" onClick={handleSaveClick}>
              {t('classifiers.save')}
            </Button>
          </div>
        </Card.Content>
      </Card>
    </form>
  );
}
