import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";

const handler = async (m, { conn }) => {
  const q = m.quoted;

  if (!q) return m.reply("📸 *Responde a una imagen para convertirla a PDF.*");

  // detectar imagen en DS6
  const mime = q.mimetype || q.msg?.mimetype || "";

  if (!mime.startsWith("image/")) {
    return m.reply("❌ *El mensaje respondido no contiene una imagen.*");
  }

  try {
    // Descargar la imagen
    const tempDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const stream = await downloadContentFromMessage(q, "image");
    const imgPath = path.join(tempDir, `img_${Date.now()}.jpg`);

    const writer = fs.createWriteStream(imgPath);
    for await (const chunk of stream) writer.write(chunk);
    writer.end();
    await new Promise((res) => writer.on("finish", res));

    // Crear PDF
    const pdfPath = imgPath.replace(".jpg", ".pdf");
    const doc = new PDFDocument({ autoFirstPage: false });
    const pdf = fs.createWriteStream(pdfPath);

    doc.pipe(pdf);

    const imgSize = doc.openImage(imgPath);

    doc.addPage({
      size: [imgSize.width, imgSize.height],
    });

    doc.image(imgPath, 0, 0, { width: imgSize.width, height: imgSize.height });

    doc.end();
    await new Promise((res) => pdf.on("finish", res));

    // Enviar PDF
    await conn.sendMessage(
      m.chat,
      {
        document: fs.readFileSync(pdfPath),
        fileName: "imagen.pdf",
        mimetype: "application/pdf",
      },
      { quoted: m }
    );

    fs.unlinkSync(imgPath);
    fs.unlinkSync(pdfPath);
  } catch (e) {
    console.log(e);
    m.reply("❌ *Error al convertir la imagen en PDF.*");
  }
};

handler.command = ["pdf", "img2pdf"];
export default handler;