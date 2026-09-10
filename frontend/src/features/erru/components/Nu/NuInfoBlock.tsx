import { Card, Heading, Text } from '@tedi-design-system/react/tedi';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../../constants/constants';

/** Uses the same field-name styling as the user and classifier information cards. */
export function NuInfoBlock({
  title,
  fields,
}: {
  title: string;
  fields: { label: string; value: string | null | undefined }[];
}) {
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  return (
    <Card className="mt-05">
      <Card.Content>
        <Heading element="h2" className="mb-1">
          {title}
        </Heading>
        <div className={isDesktop ? 'grid-3col' : 'form-grid-mobile'}>
          {fields.map(({ label, value }) => (
            <div className="field-name" key={label}>
              <Text modifiers="bold" color="secondary">
                {label}
              </Text>
              <div className="mt-025">
                <Text>{value || '—'}</Text>
              </div>
            </div>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}
