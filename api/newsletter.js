
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
       OBTENER EMAIL
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
       VERIFICAR VARIABLES
    =================================================== */

    if (!process.env.RESEND_API_KEY) {
      console.error(
        'Falta RESEND_API_KEY'
      );

      return res.status(500).json({
        error:
          'Resend no está configurado correctamente.'
      });
    }

    const segmentId =
      process.env.RESEND_SEGMENT_ID;

    if (!segmentId) {
      console.error(
        'Falta RESEND_SEGMENT_ID'
      );

      return res.status(500).json({
        error:
          'Falta configurar el segmento de newsletter.'
      });
    }

    /* ===================================================
       1. INTENTAR CREAR EL CONTACTO
    =================================================== */

    let contactId = null;

    const {
      data: createdContact,
      error: createError
    } = await resend.contacts.create({

      email: emailClean,

      unsubscribed: false

    });

    /* ===================================================
       CONTACTO NUEVO
    =================================================== */

    if (!createError) {

      contactId =
        createdContact?.id;

      console.log(
        'CONTACTO CREADO:',
        emailClean
      );

    }

    /* ===================================================
       CONTACTO YA EXISTENTE
    =================================================== */

    else {

      console.log(
        'El contacto ya puede existir:',
        createError.message
      );

      /*
       * Resend permite actualizar un contacto
       * directamente usando su email.
       */

      const {
        data: updatedContact,
        error: updateError
      } = await resend.contacts.update({

        email: emailClean,

        unsubscribed: false

      });

      if (updateError) {

        console.error(
          'RESEND CONTACT ERROR:',
          {
            message:
              updateError.message,

            name:
              updateError.name,

            statusCode:
              updateError.statusCode
          }
        );

        return res.status(500).json({

          error:
            'No se pudo guardar la suscripción.',

          detail:
            updateError.message ||
            'Error de Resend',

          statusCode:
            updateError.statusCode || null
        });
      }

      contactId =
        updatedContact?.id;

      console.log(
        'CONTACTO EXISTENTE ACTUALIZADO:',
        emailClean
      );
    }

    /* ===================================================
       VERIFICAR ID
    =================================================== */

    if (!contactId) {

      console.error(
        'Resend no devolvió contactId.'
      );

      return res.status(500).json({

        error:
          'Resend no devolvió el ID del contacto.',

        detail:
          'El contacto pudo crearse pero no se recibió su ID.'
      });
    }

    /* ===================================================
       2. AGREGAR CONTACTO AL SEGMENTO
    =================================================== */

    const {
      data: segmentData,
      error: segmentError
    } =
      await resend.contacts.segments.add({

        contactId,

        segmentId

      });

    if (segmentError) {

      console.error(
        'RESEND SEGMENT ERROR:',
        {
          message:
            segmentError.message,

          name:
            segmentError.name,

          statusCode:
            segmentError.statusCode
        }
      );

      return res.status(500).json({

        error:
          'El contacto se guardó, pero no se pudo agregar al newsletter.',

        detail:
          segmentError.message ||
          'Error al agregar al segmento',

        statusCode:
          segmentError.statusCode || null
      });
    }

    console.log(
      'CONTACTO AGREGADO AL SEGMENTO:',
      emailClean
    );

    /* ===================================================
       3. EMAIL DE BIENVENIDA
    =================================================== */

    const {
      data: emailData,
      error: emailError
    } =
      await resend.emails.send({

        from: 
          'DropRugby <newsletter@droprugby.com>',

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

                  Los Pumas · Internacional · URBA

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
       ERROR AL ENVIAR BIENVENIDA
    =================================================== */

    if (emailError) {

      console.error(
        'RESEND EMAIL ERROR:',
        {
          message:
            emailError.message,

          name:
            emailError.name,

          statusCode:
            emailError.statusCode
        }
      );

      return res.status(500).json({

        error:
          'La suscripción se guardó, pero no se pudo enviar el email de bienvenida.',

        detail:
          emailError.message ||
          'Error de Resend',

        statusCode:
          emailError.statusCode || null
      });
    }

    /* ===================================================
       ÉXITO
    =================================================== */

    return res.status(200).json({

      ok: true,

      contactId,

      emailId:
        emailData?.id || null,

      segmentId,

      message:
        '¡Suscripción realizada correctamente!'
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
