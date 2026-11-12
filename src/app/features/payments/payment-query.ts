export function paymentRedirect(params: { route: string; student?: string | null; charge?: string | null; search?: string | null }): string {
  const { route, student, charge, search } = params;

  switch (route) {
    case 'new':
      return `/payments?record=1${student ? `&student=${student}` : ''}${charge ? `&charge=${charge}` : ''}${search ? `&search=${search}` : ''}`;
    case 'partial':
      return `/payments?settlement=partial${student ? `&student=${student}` : ''}${charge ? `&charge=${charge}` : ''}${search ? `&search=${search}` : ''}`;
    case 'full':
      return `/payments?settlement=full${student ? `&student=${student}` : ''}${charge ? `&charge=${charge}` : ''}${search ? `&search=${search}` : ''}`;
    case 'receipts':
      return `/payments?receipt=1${student ? `&student=${student}` : ''}${charge ? `&charge=${charge}` : ''}${search ? `&search=${search}` : ''}`;
    case 'history':
      return `/payments?history=1${student ? `&student=${student}` : ''}${charge ? `&charge=${charge}` : ''}${search ? `&search=${search}` : ''}`;
    default:
      return '/payments';
  }
}
