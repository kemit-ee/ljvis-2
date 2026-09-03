import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Heading,
  Text,
  Row,
  Col,
} from '@tedi-design-system/react/tedi';
import { useClassifierValueForm } from '../ClassifierValueEditPage/useClassifierValueForm.ts';
import { useClassifierValueDetail } from '../ClassifierValueEditPage/useClassifierValueDetail.ts';
import { useAuth } from '../../../auth/AuthContext';
import { useClassifiers } from '../../ClassifierProvider';
import { BREAKPOINTS } from '../../../../constants/constants';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { ClassifierValueInfoCard } from '../../components/ClassifierValueInfoCard/ClassifierValueInfoCard.tsx';

export function ClassifierValueEditPage() {
  const { id, valueId } = useParams<{ id: string; valueId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const { hasPermission } = useAuth();
  const forbidden = !hasPermission('classifier_value.edit');
  const { refetch } = useClassifiers();

  const { value, loading: valueLoading } = useClassifierValueDetail(
    id,
    valueId,
  );

  const handleEditSaved = async () => {
    await refetch();
    if (id) {
      navigate(`/classifiers/${id}`, {
        state: { alert: { message: t('classifiers.valueEditedNote') } },
      });
    }
  };

  const { formik } = useClassifierValueForm(id, handleEditSaved, value);

  const handleSaveClick = () => {
    formik.submitForm();
  };

  if (valueLoading && !value) return <Text>{t('common.loading')}</Text>;
  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (!value) return <Text>{t('common.error')}</Text>;

  return (
    <div>
      <Button
        visualType="link"
        onClick={() => navigate(`/classifiers/${id}`)}
        iconLeft="arrow_back"
      >
        {t('common.back')}
      </Button>

      <div className="page-header">
        <div className="page-header-title">
          <Heading element="h1">{t('classifiers.editClassifierValue')}</Heading>
        </div>
      </div>

      <div>
        <Row className="m-0">
          <Col className="p-0">
            <ClassifierValueInfoCard
              formik={formik}
              isDesktop={isDesktop}
              isEdit={true}
              handleSaveClick={handleSaveClick}
              onCancel={() => {
                formik.resetForm();
                navigate(`/classifiers/${id}`);
              }}
            />
          </Col>
        </Row>
      </div>
    </div>
  );
}
