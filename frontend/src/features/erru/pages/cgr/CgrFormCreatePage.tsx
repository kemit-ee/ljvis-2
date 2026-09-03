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
import { useCgrForm } from './useCgrForm';
import { CgrRequestFields } from '../../components/Cgr/CgrRequestFields';
import { useAuth } from '../../../auth/AuthContext';
import { getCgrRequest } from '../../api';
import type { CgrRequest } from '../../types';
import { PageActions } from '../../../../shared/components/PageActions';

/**
 * New outgoing CGR request. Also serves "Kopeeri päring" (LJVIS2-140): when opened with
 * ?copyFrom=<id>, the tm-/certificate-prefixed fields of the source request are read via
 * GET and used to pre-fill this same create form — there is no separate copy endpoint
 * (LJVIS2-138 §4, LJVIS2-140 §4 "Nupp Kopeeri päring").
 */
export function CgrFormCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const copyFromId = searchParams.get('copyFrom') ?? undefined;
  const [copySource, setCopySource] = useState<CgrRequest | undefined>();
  const [copyLoading, setCopyLoading] = useState(!!copyFromId);

  useEffect(() => {
    if (!copyFromId) return;
    getCgrRequest(copyFromId)
      .then(setCopySource)
      .catch((e) =>
        console.error('[CgrFormCreatePage] copy source load failed', e),
      )
      .finally(() => setCopyLoading(false));
  }, [copyFromId]);

  // Only the searched-person fields are carried over — destination country, authority,
  // source and purpose are NOT copied (LJVIS2-138 §4).
  const prefill = copySource
    ? ({
        ...copySource,
        id: undefined,
        cgrTo: '',
        originatingAuthority: '',
        requestSource: '',
        requestPurpose: '',
      } as Partial<CgrRequest>)
    : undefined;

  const form = useCgrForm(prefill, (id) =>
    navigate(id ? `/erru/cgr/${id}` : '/erru/cgr'),
  );

  if (!hasAnyPermission(['cgr.create']))
    return <Text>{t('common.forbidden')}</Text>;
  if (copyLoading) return <Text>{t('common.loading')}</Text>;

  return (
    <form onSubmit={form.formik.handleSubmit}>
      <Card className="mt-05">
        <Card.Content>
          <Heading element="h1">{t('erru.cgr.form.titleNew')}</Heading>
        </Card.Content>
      </Card>

      <CgrRequestFields form={form} />

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
        <Button visualType="secondary" onClick={() => navigate('/erru/cgr')}>
          {t('common.back')}
        </Button>
        <Button type="submit" disabled={form.formik.isSubmitting}>
          {t('common.save')}
        </Button>
      </PageActions>
    </form>
  );
}
