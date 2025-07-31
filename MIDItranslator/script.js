document.getElementById("midi-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const input = document.getElementById("hex").value;
  const output = document.getElementById("output");
  output.textContent = "";

  try {
    const bytes = input
      .replace(/[^0-9A-Fa-f]/g, "")
      .match(/.{1,2}/g)
      .map((b) => parseInt(b, 16));

    const messages = parseMidiMessages(bytes);
    output.textContent = messages.join("\n\n");
  } catch (err) {
    output.textContent = "Error: Invalid MIDI Hex Code.";
  }
});

function parseMidiMessages(bytes) {
  const results = [];
  let i = 0;

  while (i < bytes.length) {
    const status = bytes[i];

    if (status >= 0x80 && status <= 0xef) {
      const type = status & 0xf0;
      const channel = (status & 0x0f) + 1;

      switch (type) {
        case 0x80: {
          const note = bytes[i + 1];
          const velocity = bytes[i + 2];
          results.push(`Note Off\nChannel: ${channel}\nNote: ${note}\nVelocity: ${velocity}`);
          i += 3;
          break;
        }
        case 0x90: {
          const note = bytes[i + 1];
          const velocity = bytes[i + 2];
          const type = velocity > 0 ? "Note On" : "Note Off";
          results.push(`${type}\nChannel: ${channel}\nNote: ${note}\nVelocity: ${velocity}`);
          i += 3;
          break;
        }
        case 0xb0: {
          const controller = bytes[i + 1];
          const value = bytes[i + 2];
          results.push(`Control Change\nChannel: ${channel}\nController: ${controller}\nValue: ${value}`);
          i += 3;
          break;
        }
        case 0xc0: {
          const program = bytes[i + 1];
          results.push(`Program Change\nChannel: ${channel}\nProgram Number: ${program}`);
          i += 2;
          break;
        }
        case 0xe0: {
          const lsb = bytes[i + 1];
          const msb = bytes[i + 2];
          const value = (msb << 7) + lsb;
          results.push(`Pitch Bend\nChannel: ${channel}\nValue: ${value}`);
          i += 3;
          break;
        }
        default:
          results.push(`Unknown Channel Message: 0x${status.toString(16)}`);
          i++;
      }
    } else if (status === 0xf0) {
      let endIndex = bytes.indexOf(0xf7, i + 1);
      if (endIndex === -1) endIndex = bytes.length;

      const data = bytes.slice(i + 1, endIndex);
      results.push(`SysEx Message\nRaw Data: ${data.map(b => b.toString(16).padStart(2, "0")).join(" ")}`);
      i = endIndex + 1;
    } else {
      results.push(`Unknown Message: 0x${status.toString(16)}`);
      i++;
    }
  }

  return results;
}
