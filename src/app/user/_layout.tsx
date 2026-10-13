import { Tabs } from 'expo-router';
import { AppTabs, tab } from '../../components/tabs';

export default function UserTabs() {
  return (
    <AppTabs>
      <Tabs.Screen name="index" options={tab('Home', undefined, undefined, false)} />
      <Tabs.Screen name="sell" options={tab('Sell', 'Sell Kits', 'Record a customer sale')} />
      <Tabs.Screen name="transfer" options={tab('Transfer', 'Transfer Kits', 'Send kits to another user')} />
      <Tabs.Screen name="request" options={tab('Requests', 'Requests & Returns', 'Ask for kits or return unsold kits')} />
      <Tabs.Screen name="activity" options={tab('History', 'My History', 'Received, sent & sold')} />
    </AppTabs>
  );
}
