param([string[]]$Files)
foreach($f in $Files){
  $fs=[IO.File]::OpenRead($f); $br=New-Object IO.BinaryReader($fs)
  $magic=$br.ReadUInt32(); $ver=$br.ReadUInt32(); $total=$br.ReadUInt32(); $jl=$br.ReadUInt32(); $jt=$br.ReadUInt32()
  $json=[Text.Encoding]::UTF8.GetString($br.ReadBytes($jl)); $fs.Close()
  $j=$json|ConvertFrom-Json
  $imgBytes=0; foreach($im in $j.images){ if($im.bufferView -ne $null){ $imgBytes+=$j.bufferViews[$im.bufferView].byteLength } }
  $tris=0; foreach($m in $j.meshes){ foreach($p in $m.primitives){ if($p.indices -ne $null){$tris+=$j.accessors[$p.indices].count/3}else{$tris+=$j.accessors[$p.attributes.POSITION].count/3} } }
  $ex=$j.asset.extras
  "=== "+[IO.Path]::GetFileName($f)
  "  title: $($ex.title) | author: $($ex.author) | license: $($ex.license)"
  "  source: $($ex.source)"
  "  total {0:N1} MB, images {1} = {2:N1} MB, tris {3:N0}, nodes {4}, ext: {5}" -f ($total/1MB),$j.images.Count,($imgBytes/1MB),$tris,$j.nodes.Count,($j.extensionsUsed -join ',')
  "  mime: "+(($j.images|%{$_.mimeType}|group|%{"$($_.Name)x$($_.Count)"}) -join ' ')
}
