/**
 * Public data-broker catalog (BLT-Vanish style). Each entry describes where and
 * how a person submits an opt-out / deletion request for THEIR OWN data. All
 * fields are public knowledge (the brokers publish these opt-out pages). We only
 * ever generate a request the user reviews and sends themselves — we never
 * submit anything automatically or log into any broker.
 */
export type OptOutMethod = 'EMAIL' | 'FORM';

export interface Broker {
  id: string;
  name: string;
  domain: string;
  /** Public opt-out page or form. */
  optOutUrl: string;
  /** Privacy/opt-out email, when the broker accepts email requests. */
  optOutEmail?: string;
  method: OptOutMethod;
  /** Legal instrument that best applies (used to pick the request template). */
  jurisdiction: 'CCPA' | 'GDPR';
  notes?: string;
}

export const BROKERS: Broker[] = [
  {
    id: 'spokeo',
    name: 'Spokeo',
    domain: 'spokeo.com',
    optOutUrl: 'https://www.spokeo.com/optout',
    optOutEmail: 'privacy@spokeo.com',
    method: 'FORM',
    jurisdiction: 'CCPA',
    notes: 'Find your listing first, then submit its URL on the opt-out page.',
  },
  {
    id: 'whitepages',
    name: 'Whitepages',
    domain: 'whitepages.com',
    optOutUrl: 'https://www.whitepages.com/suppression-requests',
    method: 'FORM',
    jurisdiction: 'CCPA',
  },
  {
    id: 'beenverified',
    name: 'BeenVerified',
    domain: 'beenverified.com',
    optOutUrl: 'https://www.beenverified.com/app/optout/search',
    optOutEmail: 'privacy@beenverified.com',
    method: 'FORM',
    jurisdiction: 'CCPA',
  },
  {
    id: 'intelius',
    name: 'Intelius',
    domain: 'intelius.com',
    optOutUrl: 'https://www.intelius.com/opt-out/',
    method: 'FORM',
    jurisdiction: 'CCPA',
  },
  {
    id: 'radaris',
    name: 'Radaris',
    domain: 'radaris.com',
    optOutUrl: 'https://radaris.com/control/privacy',
    method: 'FORM',
    jurisdiction: 'CCPA',
  },
  {
    id: 'mylife',
    name: 'MyLife',
    domain: 'mylife.com',
    optOutUrl: 'https://www.mylife.com/ccpa/index.pubview',
    optOutEmail: 'privacy@mylife.com',
    method: 'EMAIL',
    jurisdiction: 'CCPA',
  },
  {
    id: 'peoplefinders',
    name: 'PeopleFinders',
    domain: 'peoplefinders.com',
    optOutUrl: 'https://www.peoplefinders.com/opt-out',
    method: 'FORM',
    jurisdiction: 'CCPA',
  },
  {
    id: 'truthfinder',
    name: 'TruthFinder',
    domain: 'truthfinder.com',
    optOutUrl: 'https://www.truthfinder.com/opt-out/',
    method: 'FORM',
    jurisdiction: 'CCPA',
  },
  {
    id: 'peekyou',
    name: 'PeekYou',
    domain: 'peekyou.com',
    optOutUrl: 'https://www.peekyou.com/about/contact/optout/',
    method: 'FORM',
    jurisdiction: 'CCPA',
  },
  {
    id: 'acxiom',
    name: 'Acxiom',
    domain: 'acxiom.com',
    optOutUrl: 'https://isapps.acxiom.com/optout/optout.aspx',
    optOutEmail: 'privacy@acxiom.com',
    method: 'FORM',
    jurisdiction: 'GDPR',
    notes: 'Large marketing-data broker; supports both CCPA and GDPR requests.',
  },
  {
    id: 'lexisnexis',
    name: 'LexisNexis',
    domain: 'lexisnexis.com',
    optOutUrl: 'https://optout.lexisnexis.com/',
    method: 'FORM',
    jurisdiction: 'CCPA',
  },
  {
    id: 'oracle-datacloud',
    name: 'Oracle Data Cloud',
    domain: 'oracle.com',
    optOutUrl: 'https://datacloudoptout.oracle.com/',
    optOutEmail: 'dataclouduseremail_us@oracle.com',
    method: 'FORM',
    jurisdiction: 'GDPR',
  },
];

export const findBroker = (id: string): Broker | undefined =>
  BROKERS.find((b) => b.id === id);
