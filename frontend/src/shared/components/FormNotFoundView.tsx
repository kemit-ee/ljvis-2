import { Heading } from '@tedi-design-system/react/tedi';
import { FormLoadError } from './FormLoadError';

interface FormNotFoundViewProps {
  title: string;
}

/**
 * "Form not found / no access / failed to load" view used on form detail pages
 * instead of a bare error text, so the user still sees the form-type header.
 * Navigation back up the hierarchy is handled by the layout's breadcrumbs.
 */
export function FormNotFoundView({ title }: FormNotFoundViewProps) {
  return (
    <div>
      <div className="card-main">
        <Heading element="h1">{title}</Heading>
      </div>

      <FormLoadError />
    </div>
  );
}
