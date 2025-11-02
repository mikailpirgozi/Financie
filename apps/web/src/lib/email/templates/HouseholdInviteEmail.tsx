import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface HouseholdInviteEmailProps {
  invitedByName: string;
  householdName: string;
  inviteUrl: string;
  role: string;
}

export function HouseholdInviteEmail({
  invitedByName,
  householdName,
  inviteUrl,
  role,
}: HouseholdInviteEmailProps): React.ReactNode {
  const roleText = role === 'owner' ? 'správca' : 'člen';

  return (
    <Html>
      <Head />
      <Preview>Pozvánka do domácnosti {householdName} vo FinApp</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Pozvánka do domácnosti 🏠</Heading>
          <Text style={text}>
            <strong>{invitedByName}</strong> vás pozval/a do domácnosti{' '}
            <strong>{householdName}</strong> vo FinApp.
          </Text>
          <Text style={text}>
            Budete pridaný/á ako <strong>{roleText}</strong> a budete mať prístup k zdieľaným
            finančným dátam tejto domácnosti.
          </Text>
          <Section style={infoBox}>
            <Text style={infoTitle}>Čo to znamená?</Text>
            <Text style={infoText}>
              • Uvidíte všetky úvery, výdavky, príjmy a majetok domácnosti
              <br />
              • Môžete pridávať a upravovať záznamy
              <br />
              • Dostanete prístup k mesačným prehľadom
              <br />• Budete dostávať notifikácie o dôležitých udalostiach
            </Text>
          </Section>
          <Section style={buttonContainer}>
            <Button style={button} href={inviteUrl}>
              Prijať pozvánku
            </Button>
          </Section>
          <Text style={footer}>
            Ak ste túto pozvánku neočakávali, môžete tento email ignorovať.
            <br />
            Tím FinApp
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0 40px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 40px',
};

const infoBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 40px',
};

const infoTitle = {
  color: '#333',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const infoText = {
  color: '#555',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const buttonContainer = {
  padding: '27px 0 27px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#0070f3',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '0 40px',
  marginTop: '32px',
};

export default HouseholdInviteEmail;

