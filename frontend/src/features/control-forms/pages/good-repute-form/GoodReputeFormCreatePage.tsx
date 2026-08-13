import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Heading, Text, Alert } from '@tedi-design-system/react/tedi';
import { AsyncButton } from '../../../../shared/components/AsyncButton';
import { useAuth } from '../../../auth/AuthContext';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import { usePersonSearch } from '../../../xroad/hooks/usePersonSearch';
import { useGoodReputeForm } from './useGoodReputeForm';
import { GoodReputeFormFields } from '../../components/GoodRepute/GoodReputeFormFields';

export function GoodReputeFormCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { getByCode } = useClassifiers();
  const forbidden = !hasPermission('good_repute_form.write');

  const countryOptions = getByCode('RTK').map((c) => ({ value: c.code, label: c.name }));

  const handleSaved = (id?: string) => {
    navigate(`/control-forms/good-repute/${id}`, {
      state: { justCreated: true },
    });
  };

  const { formik, formError } = useGoodReputeForm(undefined, handleSaved);

  const { searchByPersonalCode, loading: searchLoading, error: searchError, notFound: searchNotFound } =
    usePersonSearch({
      onPersonFound: (person) => {
        formik.setFieldValue('firstName', person.firstName);
        formik.setFieldValue('lastName', person.lastName);
        if (person.dateOfBirth) {
          formik.setFieldValue('dateOfBirth', person.dateOfBirth);
        }
      },
    });

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div>
      <form onSubmit={formik.handleSubmit}>
        <div className="card-main">
          <Heading element="h1">{t('forms.good_repute.title')}</Heading>
        </div>

        {formError && (
          <Alert type="danger" size="small" className="mb-1">
            {formError}
          </Alert>
        )}

        <GoodReputeFormFields
          formik={formik as never}
          readOnly={false}
          countryOptions={countryOptions}
          onSearchPerson={() => searchByPersonalCode(formik.values.personalCode)}
          searchLoading={searchLoading}
          searchError={searchError}
          searchNotFound={searchNotFound}
        />

        <div className="page-actions">
          <div className="page-actions-buttons">
            <Button type="button" visualType="secondary" onClick={() => navigate('/')}>
              {t('common.cancel')}
            </Button>
            <AsyncButton type="button" onClick={() => formik.submitForm()}>
              {t('common.save')}
            </AsyncButton>
          </div>
        </div>
      </form>
    </div>
  );
}
