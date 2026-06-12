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
import { useAuth } from '../../../auth/AuthContext';
import { BREAKPOINTS } from '../../../../constants/constants';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { ClassifierValueInfoCard } from '../../components/ClassifierValueInfoCard/ClassifierValueInfoCard.tsx';

export function ClassifierValueCreatePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const { hasPermission } = useAuth();
  const forbidden = !hasPermission('classifier_value.edit');

  const handleEditSaved = () => {
    if (id) {
      navigate(`/classifiers/${id}`, {
        state: { justCreated: true },
      });
    }
  };

  const { formik } = useClassifierValueForm(id, handleEditSaved);

  const handleSaveClick = () => {
    formik.submitForm();
  };

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (!id) return <Text>{t('common.error')}</Text>;

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
          <Heading element="h1">{t('classifiers.addClassifierValue')}</Heading>
        </div>
      </div>

      <div>
        <Row className="m-0">
          <Col className="p-0">
            <ClassifierValueInfoCard
              formik={formik}
              isDesktop={isDesktop}
              isEdit={false}
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
