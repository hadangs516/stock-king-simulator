Add-Type -AssemblyName System.Drawing
$taskRoot = Split-Path -Parent $PSScriptRoot
function New-KingIcon([int]$size, [string]$name) {
  $bitmap = [System.Drawing.Bitmap]::new($size, $size)
  $canvas = [System.Drawing.Graphics]::FromImage($bitmap)
  $canvas.SmoothingMode = 'AntiAlias'
  $canvas.TextRenderingHint = 'AntiAliasGridFit'
  $canvas.Clear([System.Drawing.ColorTranslator]::FromHtml('#173f35'))
  $gold = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#d3bc85'))
  $cream = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#f3f5e8'))
  $points = [System.Drawing.PointF[]]@([System.Drawing.PointF]::new($size*.29,$size*.25),[System.Drawing.PointF]::new($size*.37,$size*.32),[System.Drawing.PointF]::new($size*.5,$size*.19),[System.Drawing.PointF]::new($size*.63,$size*.32),[System.Drawing.PointF]::new($size*.71,$size*.25),[System.Drawing.PointF]::new($size*.67,$size*.4),[System.Drawing.PointF]::new($size*.33,$size*.4))
  $canvas.FillPolygon($gold,$points)
  $font = [System.Drawing.Font]::new('Malgun Gothic', [single]($size*.205), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = 'Center'
  $canvas.DrawString('주식왕', $font, $cream, [System.Drawing.RectangleF]::new(0,$size*.46,$size,$size*.4),$format)
  $canvas.FillRectangle($gold,[single]($size*.31),[single]($size*.77),[single]($size*.38),[single]($size*.012))
  $bitmap.Save((Join-Path $taskRoot "assets/$name"),[System.Drawing.Imaging.ImageFormat]::Png)
  $font.Dispose(); $format.Dispose(); $gold.Dispose(); $cream.Dispose(); $canvas.Dispose(); $bitmap.Dispose()
}
New-KingIcon 192 'icon-192.png'
New-KingIcon 512 'icon-512.png'
$preview=[System.Drawing.Bitmap]::new(1200,630)
$canvas=[System.Drawing.Graphics]::FromImage($preview)
$canvas.Clear([System.Drawing.ColorTranslator]::FromHtml('#f1f4e9'))
$icon=[System.Drawing.Image]::FromFile((Join-Path $taskRoot 'assets/icon-512.png'))
$canvas.DrawImage($icon,100,140,350,350)
$brush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#173f35'))
$font=[System.Drawing.Font]::new('Malgun Gothic',54,[System.Drawing.FontStyle]::Bold,[System.Drawing.GraphicsUnit]::Pixel)
$canvas.DrawString("같은 시장,`n나만의 선택.",$font,$brush,500,180)
$small=[System.Drawing.Font]::new('Malgun Gothic',25,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel)
$canvas.DrawString('1,000만 원으로 시작하는 가상 투자',$small,$brush,505,380)
$preview.Save((Join-Path $taskRoot 'assets/preview.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$small.Dispose();$font.Dispose();$brush.Dispose();$icon.Dispose();$canvas.Dispose();$preview.Dispose()
