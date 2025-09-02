const nodemailer = require('nodemailer');

const moment = require('moment');
const config = require('./config.json');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASSWORD // Contraseña de aplicación de Gmail
      }
    });
  }

  async sendConfirmationEmail(reservation) {
    try {
      const formattedDate = moment(reservation.date).format('dddd, D [de] MMMM [de] YYYY');
      
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: reservation.email,
        subject: `Confirmación de reserva - ${config.businessName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">¡Reserva confirmada!</h2>
            <p>Hola <strong>${reservation.name}</strong>,</p>
            <p>Tu reserva ha sido confirmada exitosamente.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Detalles de la reserva:</h3>
              <p><strong>Fecha:</strong> ${formattedDate}</p>
              <p><strong>Hora:</strong> ${reservation.time}</p>
            </div>
            
            <p>Para cancelar tu reserva, utiliza este link:</p>
            <p><a href="${reservation.cancelUrl}" style="color: #dc3545; text-decoration: none;">Cancelar reserva</a></p>
            
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            
            <p>Saludos,<br>
            <strong>${config.businessName}</strong></p>
          </div>
        `
      };
      
      await this.transporter.sendMail(mailOptions);
      console.log(`Email de confirmación enviado a ${reservation.email}`);
      return { success: true };
    } catch (error) {
      console.error('Error enviando email de confirmación:', error);
      return { success: false, error: error.message };
    }
  }

  // ... (el resto del archivo es igual)
}

module.exports = EmailService;
