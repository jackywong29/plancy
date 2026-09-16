/**
 * Any link plancy doesn't know (an old widget, a mistyped deep link) opens
 * Today instead of an error page.
 */
import { Redirect } from 'expo-router';

export default function NotFound() {
  return <Redirect href="/" />;
}
