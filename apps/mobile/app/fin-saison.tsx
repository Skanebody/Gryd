/** Compatibility route: the September experience replaces this legacy screen. */
import { Redirect } from 'expo-router';
export default function RetiredScreen() { return <Redirect href="/season" />; }
