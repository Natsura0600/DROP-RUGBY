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
    /* =====================================================
       OBTENER EMAIL
    ===================================================== */

    const { email } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Ingresá un email válido.'
      });
    }

    const emailClean = email.trim().toLowerCase();

    /* =====================================================
       VERIFICAR API KEY
    ===================================================== */

    if (!process.env.RESEND_API_KEY) {
      console.error('Falta RESEND_API_KEY');

      return res.status(500).json({
        error: 'Resend no está configurado correctamente.'
      });
    }

    /* =====================================================
       1. CREAR / ACTUALIZAR CONTACTO
    ===================================================== */

    let contactId = null;

    const {
      data: createdContact,
      error: createError
    } = await resend.contacts.create({
      email: emailClean,
      unsubscribed: false
    });

    if (!createError) {
      contactId = createdContact?.id;

      console.log(
        'CONTACTO CREADO:',
        emailClean
      );
    } else {
      console.log(
        'El contacto ya puede existir:',
        createError.message
      );

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
            message: updateError.message,
            name: updateError.name,
            statusCode: updateError.statusCode
          }
        );

        return res.status(500).json({
          error: 'No se pudo guardar la suscripción.',
          detail:
            updateError.message ||
            'Error de Resend',
          statusCode:
            updateError.statusCode || null
        });
      }

      contactId = updatedContact?.id;

      console.log(
        'CONTACTO EXISTENTE ACTUALIZADO:',
        emailClean
      );
    }

    /* =====================================================
       VERIFICAR CONTACTO
    ===================================================== */

    if (!contactId) {
      console.error(
        'Resend no devolvió contactId.'
      );

      return res.status(500).json({
        error:
          'Resend no devolvió el ID del contacto.',
        detail:
          'No se pudo obtener el ID del contacto.'
      });
    }

    /* =====================================================
       2. AGREGAR AL SEGMENTO
       
       IMPORTANTE:
       Si falla el segmento NO BLOQUEAMOS EL EMAIL.
    ===================================================== */

    const segmentId =
      process.env.RESEND_SEGMENT_ID;

    let segmentAdded = false;

    if (segmentId) {
      const {
        error: segmentError
      } = await resend.contacts.segments.add({
        contactId,
        segmentId
      });

      if (segmentError) {
        console.error(
          'RESEND SEGMENT ERROR:',
          {
            message: segmentError.message,
            name: segmentError.name,
            statusCode: segmentError.statusCode
          }
        );
      } else {
        segmentAdded = true;

        console.log(
          'CONTACTO AGREGADO AL SEGMENTO:',
          emailClean
        );
      }
    } else {
      console.warn(
        'RESEND_SEGMENT_ID no configurado. Se continúa con el email.'
      );
    }

    /* =====================================================
       3. EMAIL DE BIENVENIDA
    ===================================================== */

    const {
      data: emailData,
      error: emailError
    } = await resend.emails.send({
      from:
        'DropRugby <newsletter@droprugby.com>',

      to: [
        emailClean
      ],

      subject:
        'Ya sos parte de DropRugby 🏉',

      html: `
<!DOCTYPE html>
<html lang="es">

<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>Ya sos parte de DropRugby</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#eeeeeb;
    font-family:Arial,Helvetica,sans-serif;
    color:#171717;
  "
>

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
      background:#eeeeeb;
      margin:0;
      padding:0;
    "
  >

    <tr>

      <td
        align="center"
        style="
          padding:35px 15px;
        "
      >

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width:620px;
            background:#ffffff;
          "
        >

          <!-- HEADER -->

          <tr>

            <td
              style="
                background:#111111;
                padding:30px 35px;
              "
            >

              <div
                style="
                  font-size:30px;
                  line-height:1;
                  font-weight:700;
                  letter-spacing:-1.5px;
                  color:#ffffff;
                "
              >
                DROP<span
                  style="
                    font-weight:400;
                  "
                >RUGBY</span>
              </div>

              <div
                style="
                  margin-top:10px;
                  font-size:10px;
                  line-height:1.4;
                  letter-spacing:2px;
                  color:#bcbcbc;
                  font-weight:700;
                "
              >
                MEDIO DIGITAL DE RUGBY
              </div>

            </td>

          </tr>

          <!-- INTRO -->

          <tr>

            <td
              style="
                padding:45px 40px 15px;
              "
            >

              <div
                style="
                  font-size:10px;
                  line-height:1.4;
                  letter-spacing:2px;
                  color:#777777;
                  font-weight:700;
                  margin-bottom:14px;
                "
              >
                BIENVENIDO A DROP RUGBY
              </div>

              <h1
                style="
                  margin:0;
                  font-size:34px;
                  line-height:1.1;
                  letter-spacing:-1px;
                  font-weight:700;
                  color:#111111;
                "
              >
                El rugby,<br>
                directo a tu bandeja.
              </h1>

            </td>

          </tr>

          <!-- TEXTO -->

          <tr>

            <td
              style="
                padding:15px 40px 5px;
              "
            >

              <p
                style="
                  margin:0 0 20px;
                  font-size:16px;
                  line-height:1.7;
                  color:#444444;
                "
              >
                Gracias por suscribirte a
                <strong>DropRugby</strong>.
              </p>

              <p
                style="
                  margin:0 0 20px;
                  font-size:16px;
                  line-height:1.7;
                  color:#444444;
                "
              >
                Desde ahora vas a recibir las
                principales noticias, análisis,
                resultados y novedades del mundo
                del rugby.
              </p>

              <p
                style="
                  margin:0;
                  font-size:16px;
                  line-height:1.7;
                  color:#444444;
                "
              >
                Queremos que tengas la información
                que importa, cuando importa.
              </p>

            </td>

          </tr>

          <!-- SEPARADOR -->

          <tr>

            <td
              style="
                padding:30px 40px 10px;
              "
            >

              <div
                style="
                  height:1px;
                  background:#ddddda;
                  width:100%;
                "
              ></div>

            </td>

          </tr>

          <!-- COBERTURA -->

          <tr>

            <td
              style="
                padding:25px 40px 10px;
              "
            >

              <div
                style="
                  font-size:10px;
                  letter-spacing:2px;
                  font-weight:700;
                  color:#777777;
                  margin-bottom:15px;
                "
              >
                NUESTRA COBERTURA
              </div>

              <p
                style="
                  margin:0;
                  font-size:18px;
                  line-height:1.6;
                  font-weight:700;
                  color:#111111;
                "
              >
                LOS PUMAS
                <span style="color:#aaaaaa;">
                  ·
                </span>
                INTERNACIONAL
                <span style="color:#aaaaaa;">
                  ·
                </span>
                URBA
              </p>

            </td>

          </tr>

          <!-- BOTÓN -->

          <tr>

            <td
              align="left"
              style="
                padding:30px 40px 40px;
              "
            >

              <a
                href="https://droprugby.com"
                target="_blank"
                style="
                  display:inline-block;
                  background:#111111;
                  color:#ffffff;
                  text-decoration:none;
                  font-size:11px;
                  font-weight:700;
                  letter-spacing:1.2px;
                  padding:16px 24px;
                "
              >
                ENTRAR A DROPRUGBY&nbsp; →
              </a>

            </td>

          </tr>

          <!-- FOOTER -->

          <tr>

            <td
              style="
                background:#f5f5f2;
                padding:25px 40px;
              "
            >

              <p
                style="
                  margin:0 0 8px;
                  font-size:12px;
                  line-height:1.5;
                  color:#777777;
                "
              >
                Gracias por ser parte de la comunidad
                DropRugby.
              </p>

              <p
                style="
                  margin:0;
                  font-size:11px;
                  line-height:1.5;
                  color:#999999;
                "
              >
                Rugby es una pasión.
              </p>

            </td>

          </tr>

        </table>

      </td>

    </tr>

  </table>

</body>

</html>
      `
    });

    /* =====================================================
       ERROR DE EMAIL
    ===================================================== */

    if (emailError) {
      console.error(
        'RESEND EMAIL ERROR:',
        {
          message: emailError.message,
          name: emailError.name,
          statusCode: emailError.statusCode
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

    /* =====================================================
       ÉXITO
    ===================================================== */

    console.log(
      'EMAIL DE BIENVENIDA ENVIADO:',
      {
        email: emailClean,
        emailId: emailData?.id || null,
        segmentAdded
      }
    );

    return res.status(200).json({
      ok: true,

      contactId,

      emailId:
        emailData?.id || null,

      segmentId:
        segmentId || null,

      segmentAdded,

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
