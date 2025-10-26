import type { DataProvider } from './DataProvider';
import { LocalJsonProvider } from './LocalJsonProvider';

const provider: DataProvider = new LocalJsonProvider();
export default provider;
