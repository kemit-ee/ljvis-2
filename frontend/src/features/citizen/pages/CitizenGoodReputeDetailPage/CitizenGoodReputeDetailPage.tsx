import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Heading, Text } from '@tedi-design-system/react/tedi';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../../constants/constants';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import { GoodReputeFormFields } from '../../../control-forms/components/GoodRepute/GoodReputeFormFields';
import { FormNotFoundView } from '../../../../shared/components/FormNotFoundView';
import type { GoodReputeForm } from '../../../control-forms/types';
import { getCitizenGoodReputeForm } from '../../api';

/**
 * Read-only good_repute_form (hea maine vorm) detail — citizen-self scope
 * only (see GET/v1/citizen/forms/good-repute.yml: this form has no
 * company_reg_code column at all, so a company representative can never be
 * authorized to view someone else's record here — only the transport
 * manager themselves, viewing their own good-repute status).
 */
export function CitizenGoodReputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const { getByCode } = useClassifiers();

  const countryOptions = useMemo(
    () =>
      getByCode('COUNTRY')
        .filter((c) => c.isValid !== false)
        .map((c) => ({ value: c.code, label: c.name })),
    [getByCode],
  );

  const [form, setForm] = useState<GoodReputeForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    getCitizenGoodReputeForm(Number(id))
      .then((data) => setForm(Array.isArray(data) ? data[0] : data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (notFound || !form)
    return <FormNotFoundView title={t('forms.good_repute.title')} />;

  return (
    <div>
      <Button
        visualType="link"
        onClick={() => {
          if ((location.state as { from?: string })?.from === 'citizen-app') {
            navigate(-1);
          } else {
            navigate('/');
          }
        }}
        iconLeft="arrow_back"
      >
        {t('common.back')}
      </Button>

      <div className="card-main">
        <Heading element="h1">
          {form.formNumber || t('forms.good_repute.title')}
        </Heading>
      </div>

      <GoodReputeFormFields
        formik={{
          values: form,
          errors: {},
          touched: {},
          setFieldValue: () => Promise.resolve(),
        } as never}
        readOnly
        countryOptions={countryOptions}
        onSearchPerson={() => {}}
        searchLoading={false}
        searchError={false}
        onSearchErrorClose={() => {}}
        searchNotFound={false}
        onSearchNotFoundClose={() => {}}
        isDesktop={isDesktop}
      />
    </div>
  );
}
