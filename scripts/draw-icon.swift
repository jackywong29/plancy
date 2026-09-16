// plancy's app icon: the all-accent p with a tick cut out of its bowl, on a
// violet-washed ground (option 4e, chosen by Jacky on 16 Sep 2026).
//
// Regenerate all three appearances from the repo root:
//   swift scripts/draw-icon.swift assets/icon/plancy-light.png  E6E2FC 5A4BE0
//   swift scripts/draw-icon.swift assets/icon/plancy-dark.png   27243F 9C92F6
//   swift scripts/draw-icon.swift assets/icon/plancy-tinted.png 000000 FFFFFF
//
// Output is 1024px, full bleed (iOS rounds the corners) and has no alpha
// channel, which App Store icons require. Tinted is a white mark on black;
// iOS applies the person's tint to it.
//
// The launch screen uses the mark alone on a transparent square, with the
// tick cut clean through (pass "clear" as the ground):
//   swift scripts/draw-icon.swift assets/icon/launch-light.png clear 6D5EF0
//   swift scripts/draw-icon.swift assets/icon/launch-dark.png  clear 8A7EF3
import AppKit
import ImageIO
import UniformTypeIdentifiers
// draw-icon.swift out.png groundHex|clear markHex — the 4e mark at 1024px.
// Geometry in the 100-unit design space, y down, then scaled by 10.24.
let args = CommandLine.arguments
func color(_ hex: String) -> CGColor {
  let v = Int(hex.hasPrefix("#") ? String(hex.dropFirst()) : hex, radix: 16)!
  return CGColor(srgbRed: CGFloat((v >> 16) & 255) / 255, green: CGFloat((v >> 8) & 255) / 255, blue: CGFloat(v & 255) / 255, alpha: 1)
}
let size = 1024
let clear = args[2] == "clear"
let ground = clear ? CGColor(gray: 0, alpha: 0) : color(args[2]), mark = color(args[3])
let space = CGColorSpace(name: CGColorSpace.sRGB)!
let ctx = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0, space: space, bitmapInfo: (clear ? CGImageAlphaInfo.premultipliedLast : CGImageAlphaInfo.noneSkipLast).rawValue)!
ctx.setShouldAntialias(true)
ctx.interpolationQuality = .high
// Flip to y-down and scale the 100-unit design to the canvas.
ctx.translateBy(x: 0, y: CGFloat(size))
ctx.scaleBy(x: CGFloat(size) / 100, y: -CGFloat(size) / 100)
if !clear {
  ctx.setFillColor(ground)
  ctx.fill(CGRect(x: 0, y: 0, width: 100, height: 100))
}
ctx.translateBy(x: -5, y: -1)
ctx.setFillColor(mark)
ctx.addPath(CGPath(roundedRect: CGRect(x: 34, y: 27, width: 10, height: 55), cornerWidth: 5, cornerHeight: 5, transform: nil))
ctx.fillPath()
ctx.fillEllipse(in: CGRect(x: 55 - 21, y: 46 - 21, width: 42, height: 42))
// The tick: painted in the ground colour, or cut out entirely when clear.
if clear { ctx.setBlendMode(.clear) }
ctx.setStrokeColor(clear ? CGColor(gray: 0, alpha: 1) : ground)
ctx.setLineWidth(5.5)
ctx.setLineCap(.round)
ctx.setLineJoin(.round)
ctx.move(to: CGPoint(x: 46, y: 46.5))
ctx.addLine(to: CGPoint(x: 52.5, y: 53))
ctx.addLine(to: CGPoint(x: 64, y: 41.5))
ctx.strokePath()
let image = ctx.makeImage()!
let destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath: args[1]) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(destination, image, nil)
precondition(CGImageDestinationFinalize(destination))
