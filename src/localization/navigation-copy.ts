import { fbs } from 'fbtee';

export const todayTabTitle = () => String(fbs('Today', 'Today tab title'));
export const historyTabTitle = () => String(fbs('History', 'History tab title'));
export const settingsTabTitle = () => String(fbs('Settings', 'Settings tab title'));
