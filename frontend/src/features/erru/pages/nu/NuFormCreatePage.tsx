import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Heading,
  Text,
} from '@tedi-design-system/react/tedi';
import { useNuForm } from './useNuForm';
import { NuMessageFields } from '../../components/Nu/NuMessageFields';
import { NuSourcePicker } from '../../components/Nu/NuSourcePicker';
import { useAuth } from '../../../auth/AuthContext';
import { getNuSource } from '../../api';
import { nuErrorMessage } from '../../nuErrors';
import type { NuMessage, NuSource, NuSourceCandidate } from '../../types';
import { PageActions } from '../../../../shared/components/PageActions';

export function NuFormCreatePage() {
  const [searchParams] = useSearchParams();
  const sourceKeyParam = searchParams.get('sourceKey') ?? undefined;
  return (
    <NuFormCreateContent
      key={sourceKeyParam ?? 'search'}
      sourceKeyParam={sourceKeyParam}
    />
  );
}

function NuFormCreateContent({ sourceKeyParam }: { sourceKeyParam?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();

  const [source, setSource] = useState<
    NuSource | NuSourceCandidate | undefined
  >();
  const [initialUnfitStartDate, setInitialUnfitStartDate] = useState<string>();
  const [sourceLoading, setSourceLoading] = useState(!!sourceKeyParam);
  const [sourceError, setSourceError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (sourceKeyParam) {
      getNuSource(sourceKeyParam)
        .then((value) => {
          if (active) {
            setSource(value);
            setInitialUnfitStartDate(value.unfitFromDate ?? undefined);
          }
        })
        .catch((error) => {
          if (active)
            setSourceError(
              nuErrorMessage(error, t, 'common.errors.unexpected', true),
            );
        })
        .finally(() => {
          if (active) setSourceLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [sourceKeyParam, t]);
  const prefill: Partial<NuMessage> | undefined = source
    ? { unfitStartDate: initialUnfitStartDate }
    : undefined;

  const form = useNuForm(
    prefill,
    source?.id,
    (id) =>
      navigate(id ? `/erru/nu/${id}` : '/erru/nu', {
        state: { justSaved: true },
      }),
    source?.snapshotId,
  );

  if (!hasAnyPermission(['nu.create']))
    return <Text>{t('common.forbidden')}</Text>;
  if (sourceLoading) return <Text>{t('common.loading')}</Text>;

  if (!source) {
    return (
      <div>
        <Card className="mt-05">
          <Card.Content>
            <Heading element="h1">{t('erru.nu.form.titleNew')}</Heading>
          </Card.Content>
        </Card>
        {sourceError && (
          <Alert type="danger" size="small" className="mt-05">
            {sourceError}
          </Alert>
        )}
        <NuSourcePicker
          onSelect={(candidate) => {
            setSource(candidate);
            setInitialUnfitStartDate(candidate.unfitFromDate ?? undefined);
          }}
        />
      </div>
    );
  }

  return (
    <form onSubmit={form.formik.handleSubmit}>
      <Card className="mt-05">
        <Card.Content>
          <Heading element="h1">{t('erru.nu.form.titleNew')}</Heading>
        </Card.Content>
      </Card>

      <NuMessageFields
        form={form}
        identity={{
          firstName: source.firstName,
          lastName: source.lastName,
          dateOfBirth: source.dateOfBirth,
          placeOfBirth: source.placeOfBirth,
          certificateNumber: source.certificateNumber,
          certificateIssueDate: source.certificateIssueDate,
          certificateIssueCountry: source.certificateCountryCode,
        }}
      />

      {sourceError && (
        <Alert type="danger" size="small">
          {sourceError}
        </Alert>
      )}
      {form.formError && (
        <Alert type="danger" size="small" className="mt-05">
          {form.formError}
        </Alert>
      )}
      {form.formik.submitCount > 0 &&
        Object.keys(form.formik.errors).length > 0 && (
          <Alert type="danger" size="small" className="mt-05">
            {t('common.formHasErrors')}
          </Alert>
        )}

      <PageActions>
        <Button
          type="button"
          visualType="secondary"
          disabled={form.formik.isSubmitting || sourceLoading}
          onClick={async () => {
            setSourceError(null);
            setSourceLoading(true);
            try {
              setSource(await getNuSource(source.id));
              form.clearFormError();
            } catch (error) {
              setSourceError(nuErrorMessage(error, t));
            } finally {
              setSourceLoading(false);
            }
          }}
        >
          {t('erru.nu.form.refreshSource')}
        </Button>
        <Button
          type="submit"
          disabled={form.formik.isSubmitting}
          isLoading={form.formik.isSubmitting}
        >
          {t('common.save')}
        </Button>
      </PageActions>
    </form>
  );
}
