import { Resend } from 'resend';

const resend = new Resend(
  process.env.RESEND_API_KEY
);

export default async function handler(req, res) {

  /* =====================================================
     MÉTODO
  ===================================================== */

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método no permitido'
    });
  }

  try {

    /* ===================================================
       EMAIL
    =================================================== */

    const { email } = req.body || {};

    if (
      !email ||
      typeof email !== 'string'
    ) {
      return res.status(400).json({
        error: 'Ingresá un email válido.'
      });
    }

    const emailClean =
      email.trim().toLowerCase();

    /* ===================================================
       VARIABLES DE RESEND
    =================================================== */

    const segmentId =
      process.env.RESEND_SEGMENT_ID;

    if (!process.env.RESEND_API_KEY) {
      console.error(
        'Falta RESEND_API_KEY.'
      );

      return res.status(500).json({
        error:
          'El servidor no tiene configurado Resend.'
      });
    }

    if (!segmentId) {
      console.error(
        'Falta RESEND_SEGMENT_ID.'
      );

      return res.status(500).json({
        error:
          'Falta configurar el segmento de newsletter.'
      });
    }

    /* ===================================================
       1. CREAR CONTACTO
    =================================================== */

    let contact = null;

    const {
      data: createdContact,
      error: contactError
    } = await resend.contacts.create({
      email: emailClean,
      unsubscribed: false
    });

    if (!contactError) {

      contact = createdContact;

      console.log(
        'CONTACTO CREADO:',
        emailClean
      );

    } else {

      /*
       * El contacto puede existir ya.
       *
       * En ese caso no hacemos fallar
       * la suscripción.
       */

      console.log(
        'CONTACT CREATE ERROR:',
        contactError.message
      );

      /*
       * Buscamos el contacto existente.
       */

      const {
        data: contacts,
        error: listError
      } = await resend.contacts.list();

      if (listError) {

        console.error(
          'CONTACT LIST ERROR:',
          listError
        );

        return res.status(500).json({
          error:
            'No se pudo verificar el contacto.',
          detail:
            listError.message ||
            'Error de Resend'
        });
      }

      contact =
        contacts?.find(
          item =>
            item.email?.toLowerCase() ===
            emailClean
        );

      if (!contact) {

        console.error(
          'RESEND CONTACT ERROR:',
          contactError
        );

        return res.status(500).json({
          error:
            'No se pudo guardar la suscripción.',
          detail:
            contactError.message ||
            'Error de Resend'
        });
      }

      /*
       * El contacto existe.
       *
       * Lo volvemos a suscribir.
       */

      if (contact.unsubscribed) {

        const {
          data: updatedContact,
          error: updateError
        } = await resend.contacts.update({
          id: contact.id,
          unsubscribed: false
        });

        if (updateError) {

          console.error(
            'CONTACT UPDATE ERROR:',
            updateError
          );

          return res.status(500).json({
            error:
              'No se pudo reactivar la suscripción.',
            detail:
              updateError.message ||
              'Error de Resend'
          });
        }

        contact = {
          ...contact,
          ...updatedContact
        };
      }

      console.log(
        'CONTACTO YA EXISTÍA:',
        emailClean
      );
    }

    /* ===================================================
       2. AGREGAR AL SEGMENTO
    =================================================== */

    const {
      error: segmentError
    } = await resend.contacts.segments.add({
      contactId: contact.id,
      segmentId
    });

    if (segmentError) {

      /*
       * Si ya pertenece al segmento,
       * Resend puede devolver un error.
       *
       * En ese caso no queremos romper
       * toda la suscripción.
       */

      console.error(
        'SEGMENT ERROR:',
        segmentError
      );

      /*
       * Intentamos igualmente continuar.
       */
    } else {

      console.log(
        'CONTACTO AGREGADO AL SEGMENTO:',
        emailClean
      );
    }

    /* ===================================================
       3. EMAIL DE BIENVENIDA
    =================================================== */

    const {
      data: emailData,
      error: emailError
    } = await resend.emails.send({

      from:
        'DropRugby <onboarding@resend.dev>',

      to: [
        emailClean
      ],

      subject:
        'Bienvenido a DropRugby 🏉',

      html: `
        <!DOCTYPE html>

        <html lang="es">

        <head>
          <meta charset="UTF-8">

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          >

          <title>
            Bienvenido a DropRugby
          </title>
        </head>

        <body style="
          margin:0;
          padding:0;
          background:#f4f4f2;
          font-family:Arial,Helvetica,sans-serif;
        ">

          <div style="
            max-width:600px;
            margin:40px auto;
            background:#ffffff;
            padding:40px;
          ">

            <h1 style="
              margin:0 0 10px;
              font-size:32px;
              letter-spacing:-1px;
              color:#111;
            ">
              DROP<span style="
                font-weight:400;
              ">RUGBY</span>
            </h1>

            <p style="
              color:#777;
              margin-bottom:35px;
              font-size:14px;
            ">
              Rugby es una pasión.
            </p>

            <h2 style="
              color:#111;
              font-size:24px;
            ">
              ¡Gracias por suscribirte! 🏉
            </h2>

            <p style="
              font-size:16px;
              line-height:1.6;
              color:#333;
            ">
              Ya estás dentro de la newsletter
              de DropRugby.
            </p>

            <p style="
              font-size:16px;
              line-height:1.6;
              color:#333;
            ">
              A partir de ahora recibirás las
              principales noticias, análisis y
              novedades del mundo del rugby.
            </p>

            <div style="
              margin:30px 0;
              padding:20px;
              background:#f5f5f5;
            ">

              <strong>
                Los Pumas · Super Rugby · URBA
              </strong>

            </div>

            <p style="
              font-size:14px;
              color:#888;
            ">
              Gracias por ser parte de DropRugby.
            </p>

          </div>

        </body>
        </html>
      `
    });

    /* ===================================================
       ERROR EMAIL
    =================================================== */

    if (emailError) {

      console.error(
        'RESEND EMAIL ERROR:',
        emailError
      );

      return res.status(500).json({
        error:
          'La suscripción se guardó, pero no se pudo enviar el email de bienvenida.',
        detail:
          emailError.message ||
          'Error de Resend'
      });
    }

    /* ===================================================
       ÉXITO
    =================================================== */

    return res.status(200).json({

      ok: true,

      contactId:
        contact?.id || null,

      emailId:
        emailData?.id || null,

      message:
        'Suscripción realizada correctamente.'
    });

  } catch (error) {

    console.error(
      'NEWSLETTER ERROR:',
      error
    );

    return res.status(500).json({

      error:
        'Error interno del servidor.',

      detail:
        error instanceof Error
          ? error.message
          : String(error)
    });
  }
}
