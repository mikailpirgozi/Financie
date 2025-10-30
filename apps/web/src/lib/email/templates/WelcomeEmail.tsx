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

interface WelcomeEmailProps {
  userName: string;
  loginUrl: string;
}

export function WelcomeEmail({ userName, loginUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Vitajte vo FinApp - Inteligentná správa osobných financií</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Vitajte vo FinApp! 🎉</Heading>
          <Text style={text}>
            Ahoj {userName},
          </Text>
          <Text style={text}>
            Ďakujeme, že ste sa zaregistrovali do FinApp. Teraz máte prístup k inteligentnej
            správe vašich osobných financií na jednom mieste.
          </Text>
          <Section style={features}>
            <Text style={featureTitle}>Čo môžete robiť:</Text>
            <Text style={featureItem}>💰 Spravovať úvery s automatickým harmonogramom splátok</Text>
            <Text style={featureItem}>📊 Sledovať výdavky a príjmy</Text>
            <Text style={featureItem}>🏠 Evidovať majetok a jeho hodnotu</Text>
            <Text style={featureItem}>📅 Dostávať mesačné prehľady</Text>
            <Text style={featureItem}>🔔 Prijímať notifikácie o splatnostiach</Text>
          </Section>
          <Section style={buttonContainer}>
            <Button style={button} href={loginUrl}>
              Prihlásiť sa do FinApp
            </Button>
          </Section>
          <Text style={footer}>
            Ak máte akékoľvek otázky, neváhajte nás kontaktovať.
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

const features = {
  padding: '0 40px',
  margin: '24px 0',
};

const featureTitle = {
  color: '#333',
  fontSize: '18px',
  fontWeight: '600',
  margin: '16px 0 12px',
};

const featureItem = {
  color: '#555',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
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

export default WelcomeEmail;

