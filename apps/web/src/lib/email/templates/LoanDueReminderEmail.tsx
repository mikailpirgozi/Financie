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

interface LoanDueReminderEmailProps {
  userName: string;
  lender: string;
  dueDate: string;
  amount: number;
  daysOverdue: number;
  loanUrl: string;
}

export function LoanDueReminderEmail({
  userName,
  lender,
  dueDate,
  amount,
  daysOverdue,
  loanUrl,
}: LoanDueReminderEmailProps): React.ReactNode {
  const formattedAmount = new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);

  const formattedDate = new Date(dueDate).toLocaleDateString('sk-SK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Html>
      <Head />
      <Preview>Pripomienka splatnosti úveru od {lender}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>⚠️ Pripomienka splatnosti úveru</Heading>
          <Text style={text}>Ahoj {userName},</Text>
          <Text style={text}>
            Pripomíname vám, že splátka úveru od <strong>{lender}</strong> je po splatnosti.
          </Text>
          <Section style={alertBox}>
            <Text style={alertTitle}>Detaily splátky:</Text>
            <Text style={alertItem}>
              <strong>Suma:</strong> {formattedAmount}
            </Text>
            <Text style={alertItem}>
              <strong>Dátum splatnosti:</strong> {formattedDate}
            </Text>
            <Text style={alertItem}>
              <strong>Omeškanie:</strong> {daysOverdue} {daysOverdue === 1 ? 'deň' : daysOverdue < 5 ? 'dni' : 'dní'}
            </Text>
          </Section>
          <Text style={warningText}>
            Prosím, uhraďte túto splátku čo najskôr, aby ste sa vyhli prípadným penalizáciám
            alebo negatívnemu dopadu na váš úverový rating.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={loanUrl}>
              Zobraziť detail úveru
            </Button>
          </Section>
          <Text style={footer}>
            Toto je automatická pripomienka z FinApp.
            <br />
            Ak ste už splátku uhradili, môžete tento email ignorovať.
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
  color: '#d32f2f',
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

const alertBox = {
  backgroundColor: '#fff3e0',
  borderLeft: '4px solid #ff9800',
  borderRadius: '4px',
  padding: '20px',
  margin: '24px 40px',
};

const alertTitle = {
  color: '#333',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const alertItem = {
  color: '#555',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
};

const warningText = {
  color: '#d32f2f',
  fontSize: '15px',
  lineHeight: '24px',
  padding: '0 40px',
  margin: '16px 0',
  fontWeight: '500',
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

export default LoanDueReminderEmail;

