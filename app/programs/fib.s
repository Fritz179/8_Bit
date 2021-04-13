; FIBONACCI

begin:    clr Rb
          clr Ra
          inc Ra
loop:     add Ra
          jc  #begin
          mov Rb,Ra
          mov Ra,Rd
          jmp #loop

; MULT

begin:    clr Rb
          clr Ra
start:    inc Ra
          mov Rb, Ra
loop:     add Ra
          mov Rb, Rd
          jnc #start
end:      hlt

begin:    clr Rb
          inc Rb
          mov [0], Rb
          mov [1], Rb
          mov Ra, Rb
dopow:    add Ra
          mov Rb, Rd
          dec []
          jnc dopow
